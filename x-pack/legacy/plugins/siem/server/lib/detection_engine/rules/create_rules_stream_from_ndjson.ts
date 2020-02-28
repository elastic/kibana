/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Transform } from 'stream';
import { has, isString } from 'lodash/fp';
import { ImportRuleAlertRest } from '../types';
import {
  createSplitStream,
  createMapStream,
  createFilterStream,
  createConcatStream,
} from '../../../../../../../../src/legacy/utils/streams';
import { importRulesSchema } from '../routes/schemas/import_rules_schema';

export interface RulesObjectsExportResultDetails {
  /** number of successfully exported objects */
  exportedCount: number;
}

export const parseNdjsonStrings = (): Transform => {
  return createMapStream((ndJsonStr: string) => {
    if (isString(ndJsonStr) && ndJsonStr.trim() !== '') {
      try {
        return JSON.parse(ndJsonStr);
      } catch (err) {
        return err;
      }
    }
  });
};

export const filterExportedCounts = (): Transform => {
  return createFilterStream<ImportRuleAlertRest | RulesObjectsExportResultDetails>(
    obj => obj != null && !has('exported_count', obj)
  );
};

export const validateRules = (): Transform => {
  return createMapStream((obj: ImportRuleAlertRest) => {
    if (!(obj instanceof Error)) {
      const validated = importRulesSchema.validate(obj);
      if (validated.error != null) {
        return new TypeError(validated.error.message);
      } else {
        return validated.value;
      }
    } else {
      return obj;
    }
  });
};

// Adaptation from: saved_objects/import/create_limit_stream.ts
export const createLimitStream = (limit: number): Transform => {
  let counter = 0;
  return new Transform({
    objectMode: true,
    async transform(obj, _, done) {
      if (counter >= limit) {
        return done(new Error(`Can't import more than ${limit} rules`));
      }
      counter++;
      done(undefined, obj);
    },
  });
};

// TODO: Capture both the line number and the rule_id if you have that information for the error message
// eventually and then pass it down so we can give error messages on the line number

/**
 * Inspiration and the pattern of code followed is from:
 * saved_objects/lib/create_saved_objects_stream_from_ndjson.ts
 */
export const createRulesStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    validateRules(),
    createLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};
