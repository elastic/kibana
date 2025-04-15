/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { isEmpty } from 'lodash';
import { LoghubSystem } from './read_loghub_system_files';
import { getFileOrThrow, getQueriesFilename } from './utils';

interface DslQuery {
  bool: {
    filter: Array<
      | {
          match: {
            message:
              | {
                  query: string;
                  operator?: 'AND' | 'OR';
                }
              | string;
          };
        }
      | {
          regexp: {
            message: string;
          };
        }
    >;
  };
}

export interface LoghubQuery {
  id: string;
  title: string;
  description: string;
  query: DslQuery;
}

export const querySchema: z.ZodSchema<LoghubQuery, z.ZodTypeDef, any> = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  query: z
    .union([
      z.object({}, {}).passthrough(),
      z.string().transform((arg) => JSON.parse(arg) as object),
    ])
    .refine(
      (arg): arg is Record<string, any> => {
        return !isEmpty(arg);
      },
      { message: `Object cannot be empty` }
    )
    .pipe(
      z.object({
        bool: z.object({
          filter: z.array(
            z.union([
              z.object({ regexp: z.object({ message: z.string() }) }),
              z.object({
                match: z.object({
                  message: z.union([
                    z.string(),
                    z.object({
                      query: z.string(),
                      operator: z
                        .string()
                        .toUpperCase()
                        .pipe(z.union([z.literal('AND'), z.literal('OR')]))
                        .optional(),
                    }),
                  ]),
                }),
              }),
            ])
          ),
        }),
      })
    ),
});

export const queryFileSchema = z.object({
  queries: z.array(querySchema),
});

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 0);
}

type StructuredInputMatchFunction = (input: { tokens: string[]; raw: string }) => boolean;

export function createQueryMatcher(query: DslQuery): StructuredInputMatchFunction {
  const validators = query.bool.filter.map((queryContainer): StructuredInputMatchFunction => {
    if ('match' in queryContainer) {
      const { query: q, operator = 'OR' } =
        typeof queryContainer.match.message === 'string'
          ? { query: queryContainer.match.message, operator: 'OR' }
          : queryContainer.match.message;

      const tokens = tokenize(q);
      return (input) => {
        return operator === 'AND'
          ? tokens.every((token) => input.tokens.includes(token))
          : tokens.some((token) => input.tokens.includes(token));
      };
    }
    const regex = new RegExp(queryContainer.regexp.message);
    return (input) => !!input.raw.match(regex);
  });

  return (line) => validators.every((validator) => validator(line));
}

function executeQuery(query: DslQuery, system: LoghubSystem) {
  const matcher = createQueryMatcher(query);

  return system.logLines.filter((line) => {
    const input = { tokens: tokenize(line), raw: line };
    return matcher(input);
  });
}

export async function validateQueries(system: LoghubSystem): Promise<void> {
  const { queries } = queryFileSchema.parse(
    JSON.parse(await getFileOrThrow(getQueriesFilename(system)))
  );

  const results = queries.map(({ id, query }) => {
    const hits = executeQuery(query, system);

    return {
      id,
      query: JSON.stringify(query.bool.filter[0]),
      hits: hits.length,
    };
  });

  const hasSomeHits = results.some((result) => result.hits > 0);

  if (!hasSomeHits) {
    throw new Error('No query returned any hits');
  }
}
