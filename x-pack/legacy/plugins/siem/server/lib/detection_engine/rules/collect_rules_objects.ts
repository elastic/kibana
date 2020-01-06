/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable, Transform } from 'stream';
import {
  createPromiseFromStreams,
  createFilterStream,
  createConcatStream,
} from '../../../../../../../../src/legacy/utils/streams';

import { RuleAlertParamsRest } from '../types';

interface CollectRulesObjectsOptions {
  readStream: Readable;
  objectLimit: number;
}

export interface SavedRulesImportValidationError {
  type: 'validation';
  message: string;
  statusCode: number;
}

export interface SavedRulesImportError {
  error: SavedRulesImportValidationError;
}

export const createLimitStream = (limit: number) => {
  let counter = 0;
  return new Transform({
    objectMode: true,
    async transform(obj, enc, done) {
      if (counter >= limit) {
        return done(new Error(`Can't import more than ${limit} objects`));
      }
      counter++;
      done(undefined, obj);
    },
  });
};

export const collectRulesObjects = async ({
  readStream,
  objectLimit,
}: CollectRulesObjectsOptions) => {
  let errors: SavedRulesImportError[] = [];
  const collectedObjects: RuleAlertParamsRest[] = await createPromiseFromStreams([
    readStream,
    createLimitStream(objectLimit),
    createFilterStream<RuleAlertParamsRest>((obj: RuleAlertParamsRest | Error) => {
      if (obj instanceof Error) {
        errors = [
          ...errors,
          {
            error: {
              type: 'validation',
              message: obj.message,
              statusCode: 400,
            },
          },
        ];
        return false;
      } else {
        console.log('YOLO I SEE THIS obj:', JSON.stringify(obj, null, 2));
        return true;
      }
    }),
    createConcatStream([]),
  ]);
  return {
    errors,
    collectedObjects,
  };
};
