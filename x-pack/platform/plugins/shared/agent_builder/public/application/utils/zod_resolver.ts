/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { z } from '@kbn/zod/v4';
import { get } from 'lodash';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

export const zodResolver = <T extends FieldValues>(schema: z.ZodType): Resolver<T> => {
  return async (data, _context, _options) => {
    try {
      const values = (await schema.parseAsync(data)) as T;
      return {
        values,
        errors: {} as FieldErrors<T>,
      };
    } catch (error: unknown) {
      if (!(error instanceof z.ZodError)) {
        throw error;
      }
      const errors = error.issues.reduce<FieldErrors<T>>((errorMap, issue) => {
        const path = issue.path.join('.');
        if (!get(errorMap, path)) {
          set(errorMap, path, {
            type: issue.code,
            message: issue.message,
          });
        }
        return errorMap;
      }, {} as FieldErrors<T>);

      return {
        values: {} as T,
        errors,
      };
    }
  };
};
