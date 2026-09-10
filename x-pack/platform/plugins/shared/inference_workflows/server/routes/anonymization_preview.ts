/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, randomBytes } from 'crypto';
import { schema } from '@kbn/config-schema';
import { RE2JS } from 're2js';
import type { IRouter } from '@kbn/core/server';

// TODO(spike): This is a temporary inline of generateEntityToken from
// x-pack/platform/plugins/shared/inference/server/workflow_anonymization/detection/entity_mask.ts
// Before this ships, extract both this function and derivePreviewScope to a shared package
// (e.g. @kbn/inference-anonymization-utils) that both `inference` and `inference_workflows` depend on,
// so there is a single canonical implementation.
const generateEntityToken = (executionScope: string, entityClass: string, value: string): string => {
  // Length-prefixed format prevents delimiter collisions — keep in sync with canonical impl.
  const hmacInput = `${entityClass.length}:${entityClass}:${value.length}:${value}`;
  const hash = createHmac('sha256', executionScope).update(hmacInput).digest('hex');
  return `${entityClass}_${hash.substring(0, 32)}`;
};

// Mirrors the scope derivation in create_pii_tokenization_context.ts.
// For preview there is no stable sessionId, so we use randomBytes as the per-request
// "session" material. When a serverSalt is present the result is still HMAC-hardened.
const derivePreviewScope = (serverSalt: string | undefined): string => {
  const requestMaterial = randomBytes(32).toString('hex');
  if (!serverSalt) return requestMaterial;
  return createHmac('sha256', serverSalt).update(`preview:${requestMaterial}`).digest('hex');
};
import { BUILT_IN_PATTERNS, type BuiltInEntityClass } from '@kbn/workflows/managed';
import { anonymizationApiPrivileges } from '../../common/anonymization_features';

/**
 * A resolved pattern rule ready to run against text.
 * Mirrors the PiiRegexRule shape in inference/server/workflow_anonymization/detection/types.ts
 * without taking a dependency across plugin boundaries.
 */
interface ResolvedRule {
  entityClass: string;
  pattern: string;
}

type CompiledRule =
  | { engine: 're2'; pattern: ReturnType<typeof RE2JS.compile>; entityClass: string }
  | { engine: 'native'; pattern: RegExp; entityClass: string };

const compileRule = (entityClass: string, rawPattern: string): CompiledRule => {
  try {
    return { engine: 're2', pattern: RE2JS.compile(rawPattern), entityClass };
  } catch {
    return { engine: 'native', pattern: new RegExp(rawPattern, 'g'), entityClass };
  }
};

interface Match {
  start: number;
  end: number;
  entityClass: string;
  matchValue: string;
}

const findMatches = (compiled: CompiledRule, value: string): Match[] => {
  const matches: Match[] = [];
  if (compiled.engine === 're2') {
    const matcher = compiled.pattern.matcher(value);
    while (matcher.find()) {
      const start = matcher.start();
      const end = matcher.end();
      if (end > start) {
        matches.push({
          start,
          end,
          entityClass: compiled.entityClass,
          matchValue: value.slice(start, end),
        });
      }
    }
  } else {
    compiled.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = compiled.pattern.exec(value)) !== null) {
      if (m[0].length === 0) {
        compiled.pattern.lastIndex++;
        continue;
      }
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        entityClass: compiled.entityClass,
        matchValue: m[0],
      });
    }
  }
  return matches;
};

/**
 * Tokenizes a string by replacing each matched span with a token and returns the
 * tokenized text and the token→original-value map.
 */
const tokenize = (
  text: string,
  rules: ResolvedRule[],
  serverSalt: string | undefined
): { tokenized: string; tokenMap: Record<string, string> } => {
  const compiled = rules.map((r) => compileRule(r.entityClass, r.pattern));

  // Collect all non-overlapping matches sorted by start position.
  const allMatches: Match[] = [];
  for (const rule of compiled) {
    const hits = findMatches(rule, text);
    for (const hit of hits) {
      // Skip if overlapping with an already-accepted match.
      const overlaps = allMatches.some((m) => hit.start < m.end && hit.end > m.start);
      if (!overlaps) {
        allMatches.push(hit);
      }
    }
  }
  allMatches.sort((a, b) => a.start - b.start);

  const executionScope = derivePreviewScope(serverSalt);
  const valueToToken = new Map<string, string>();

  const tokenMap: Record<string, string> = {};
  let result = '';
  let pos = 0;
  for (const match of allMatches) {
    result += text.slice(pos, match.start);

    const cacheKey = `${match.entityClass}:${match.matchValue}`;
    let token = valueToToken.get(cacheKey);
    if (!token) {
      token = generateEntityToken(executionScope, match.entityClass, match.matchValue);
      valueToToken.set(cacheKey, token);
    }

    tokenMap[token] = match.matchValue;
    result += token;
    pos = match.end;
  }
  result += text.slice(pos);
  return { tokenized: result, tokenMap };
};

export const registerAnonymizationPreviewRoute = ({
  router,
  serverSalt,
}: {
  router: IRouter;
  serverSalt: string | undefined;
}) => {
  router.post(
    {
      path: '/internal/inference_workflows/anonymization/_preview',
      security: {
        authz: {
          requiredPrivileges: [anonymizationApiPrivileges.read],
        },
      },
      validate: {
        body: schema.object({
          /** Sample text to tokenize. Bounded to prevent accidental oversized payloads. */
          text: schema.string({ minLength: 1, maxLength: 10_000 }),
          builtInRules: schema.arrayOf(
            schema.object({
              entityClass: schema.oneOf([
                schema.literal('EMAIL'),
                schema.literal('IP'),
                schema.literal('HOST_NAME'),
                schema.literal('USER_NAME'),
              ]),
              enabled: schema.boolean(),
            }),
            { maxSize: 20 }
          ),
          customRules: schema.arrayOf(
            schema.object({
              id: schema.string({ minLength: 1, maxLength: 128 }),
              name: schema.string({ minLength: 1, maxLength: 256 }),
              entityClass: schema.string({ maxLength: 64 }),
              pattern: schema.string({ minLength: 1, maxLength: 2048 }),
              enabled: schema.boolean(),
            }),
            { maxSize: 100 }
          ),
        }),
      },
    },
    async (_ctx, request, response) => {
      const { text, builtInRules, customRules } = request.body;

      // Validate all custom patterns compile under RE2 before running.
      const invalidPatterns: Array<{ id: string; name: string; error: string }> = [];
      for (const rule of customRules) {
        if (!rule.enabled) continue;
        try {
          RE2JS.compile(rule.pattern);
        } catch (err) {
          invalidPatterns.push({
            id: rule.id,
            name: rule.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      if (invalidPatterns.length > 0) {
        return response.badRequest({
          body: JSON.stringify({
            message: 'One or more custom patterns are not valid RE2 expressions',
            invalidPatterns,
          }),
        });
      }

      const activeRules: ResolvedRule[] = [
        ...builtInRules
          .filter((r) => r.enabled)
          .map((r) => ({
            entityClass: r.entityClass,
            pattern: BUILT_IN_PATTERNS[r.entityClass as BuiltInEntityClass],
          })),
        ...customRules
          .filter((r) => r.enabled)
          .map((r) => ({ entityClass: r.entityClass, pattern: r.pattern })),
      ];

      const { tokenized, tokenMap } = tokenize(text, activeRules, serverSalt);

      return response.ok({
        body: {
          tokenized,
          tokenMap,
        },
      });
    }
  );
};
