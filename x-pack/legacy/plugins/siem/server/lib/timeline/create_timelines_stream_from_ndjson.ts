/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transform } from 'stream';
import {
  createConcatStream,
  createSplitStream,
  createMapStream,
} from '../../../../../../../src/legacy/utils';
import {
  parseNdjsonStrings,
  filterExportedCounts,
  createLimitStream,
} from '../detection_engine/rules/create_rules_stream_from_ndjson';
import { importTimelinesSchema } from './routes/schemas/import_timelines_schema';
import { BadRequestError } from '../detection_engine/errors/bad_request_error';
import { ImportTimelineResponse } from './routes/utils/import_timelines';

export const validateTimelines = (): Transform => {
  return createMapStream((obj: ImportTimelineResponse) => {
    if (!(obj instanceof Error)) {
      const validated = importTimelinesSchema.validate(obj);
      if (validated.error != null) {
        return new BadRequestError(validated.error.message);
      } else {
        return validated.value;
      }
    } else {
      return obj;
    }
  });
};

export const createTimelinesStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    validateTimelines(),
    createLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};
