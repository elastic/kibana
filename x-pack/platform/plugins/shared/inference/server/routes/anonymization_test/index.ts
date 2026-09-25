/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { anonymizeRecords } from '../../chat_complete/anonymization/anonymize_records';
import type { RegexWorkerService } from '../../chat_complete/anonymization/regex_worker_service';
import type { InferenceServerStart, InferenceStartDependencies } from '../../types';
import { applyStringReplacements, flattenJsonStrings } from './flatten_json';

const testRegexRuleSchema = schema.object({
  type: schema.literal('RegExp'),
  enabled: schema.boolean(),
  pattern: schema.string({ maxLength: 2000 }),
  entityClass: schema.string({ maxLength: 100 }),
  id: schema.maybe(schema.string({ maxLength: 100 })),
  name: schema.maybe(schema.string({ maxLength: 200 })),
  builtIn: schema.maybe(schema.boolean()),
});

const testAnonymizationBodySchema = schema.object({
  input: schema.any(),
  rules: schema.arrayOf(testRegexRuleSchema, { maxSize: 200 }),
});

interface AnonymizationBreakdownEntry {
  entityType: string;
  originalValue: string;
  mask: string;
  occurrences: number;
}

/**
 * Registers the Anonymization Settings management page's "Pattern tester": an ephemeral,
 * non-persisting endpoint that runs the caller-supplied regex rules against caller-supplied
 * sample JSON, using the same detection/masking code the real `chatComplete` pipeline uses.
 * NER rules are intentionally not supported here — the management UI never sends them.
 */
export function registerAnonymizationTestRoute({
  router,
  coreSetup,
  getRegexWorker,
  logger,
}: {
  router: IRouter<RequestHandlerContext>;
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  getRegexWorker: () => RegexWorkerService | undefined;
  logger: Logger;
}) {
  router.post(
    {
      path: '/internal/inference/anonymization/_test',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route runs an ephemeral, non-persisting anonymization dry-run using rules ' +
            'supplied in the request body; it reads and writes no stored data. It backs the ' +
            'Pattern tester in the Anonymization Settings management page.',
        },
      },
      validate: {
        body: testAnonymizationBodySchema,
      },
    },
    async (_context, request, response) => {
      const regexWorker = getRegexWorker();
      if (!regexWorker) {
        return response.customError({
          statusCode: 503,
          body: { message: 'Anonymization service is not yet available' },
        });
      }

      const { input, rules } = request.body;
      const enabledRules = (rules as RegexAnonymizationRule[]).filter((rule) => rule.enabled);
      const flattened = flattenJsonStrings(input);

      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

      try {
        const { records, anonymizations } = await anonymizeRecords({
          input: [flattened],
          anonymizationRules: enabledRules,
          regexWorker,
          esClient,
          logger,
        });

        const maskedInput = applyStringReplacements(input, records[0] ?? {});

        const breakdownByKey = new Map<string, AnonymizationBreakdownEntry>();
        anonymizations.forEach(({ entity }) => {
          const key = `${entity.class_name}\u0000${entity.value}\u0000${entity.mask}`;
          const existing = breakdownByKey.get(key);
          if (existing) {
            existing.occurrences += 1;
          } else {
            breakdownByKey.set(key, {
              entityType: entity.class_name,
              originalValue: entity.value,
              mask: entity.mask,
              occurrences: 1,
            });
          }
        });

        const anonymizationBreakdown = [...breakdownByKey.values()];

        return response.ok({
          body: {
            maskedInput,
            anonymizations: anonymizationBreakdown,
            stats: {
              valuesMasked: anonymizations.length,
              uniqueValues: anonymizationBreakdown.length,
              rulesApplied: enabledRules.length,
            },
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 400,
          body: {
            message: `Pattern test failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        });
      }
    }
  );
}
