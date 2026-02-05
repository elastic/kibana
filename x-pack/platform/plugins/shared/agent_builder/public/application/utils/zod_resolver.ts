/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { z } from '@kbn/zod';
import { get } from 'lodash';
import type { FieldValues, ResolverOptions } from 'react-hook-form';

export const zodResolver =
  <T extends FieldValues>(schema: z.ZodSchema<T>) =>
  async (data: T, context: any, options: ResolverOptions<T>) => {
    try {
      const values = await schema.parseAsync(data);
      return {
        values,
        errors: {},
      };
    } catch (error: unknown) {
      if (!(error instanceof z.ZodError)) {
        throw error;
      }
      const errors = error.issues.reduce<Record<string, { type: string; message: string }>>(
        (errorMap, issue) => {
          const path = issue.path.join('.');
          if (!get(errorMap, path)) {
            set(errorMap, path, {
              type: issue.code,
              message: issue.message,
            });
          }
          return errorMap;
        },
        {}
      );

      return {
        values: {},
        errors,
      };
    }
  };
