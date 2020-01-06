/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import { has } from 'lodash/fp';
import { RuleAlertParamsRest } from '../types';
import {
  createSplitStream,
  createMapStream,
  createFilterStream,
} from '../../../../../../../../src/legacy/utils/streams';
import { importRulesSchema } from '../routes/schemas/import_rules_schema';

export interface RulesObjectsExportResultDetails {
  /** number of successfully exported objects */
  exportedCount: number;
}

export const createRulesStreamFromNdJson = (ndJsonStream: Readable) => {
  return ndJsonStream
    .pipe(createSplitStream('\n'))
    .pipe(
      createMapStream((str: string) => {
        if (str && str.trim() !== '') {
          console.log('str is: ---->', str);
          try {
            return JSON.parse(str);
          } catch (err) {
            console.log('I am returning a parse error');
            return err;
          }
        }
      })
    )
    .pipe(
      createFilterStream<RuleAlertParamsRest | RulesObjectsExportResultDetails>(
        obj => !!obj && !has('exportedCount', obj)
      )
    )
    .pipe(
      createMapStream((obj: RuleAlertParamsRest) => {
        if (!(obj instanceof Error)) {
          console.log('Here is what I have now for you:', obj);
          const validated = importRulesSchema.validate(obj);
          if (validated.error != null) {
            console.log(validated.error.message);
            return new TypeError(validated.error.message);
          } else {
            return validated.value;
          }
        }
        return obj;
      })
    );
};
