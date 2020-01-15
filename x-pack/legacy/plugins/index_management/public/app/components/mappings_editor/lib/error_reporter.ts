/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValidationError, Validation } from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { Reporter } from 'io-ts/lib/Reporter';

export type ReporterResult = Array<{ path: string[]; message: string }>;

export const failure = (validation: any): ReporterResult => {
  return validation.map((e: ValidationError) => {
    const path: string[] = [];
    let validationName = '';

    e.context.forEach((ctx, idx) => {
      if (ctx.key) {
        path.push(ctx.key);
      }

      if (idx === e.context.length - 1) {
        validationName = ctx.type.name;
      }
    });
    const lastItemName = path[path.length - 1];
    return {
      path,
      message:
        'Invalid value ' +
        JSON.stringify(e.value) +
        ` supplied to ${lastItemName}(${validationName})`,
    };
  });
};

const empty: never[] = [];
const success = () => empty;

export const ErrorReporter: Reporter<ReporterResult> = {
  report: (validation: Validation<any>) => fold(failure, success)(validation as any),
};
