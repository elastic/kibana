/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transform } from 'stream';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
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

import { ImportTimelineResponse } from './routes/utils/import_timelines';
import { ImportTimelinesSchemaRt } from './routes/schemas/import_timelines_schema';
import { throwErrors } from '../../../../../../plugins/case/common/api';

export const validateTimelines = (): Transform => {
  return createMapStream((obj: ImportTimelineResponse) => {
    return pipe(
      ImportTimelinesSchemaRt.decode(obj),
      fold(
        throwErrors(msg => new Error(msg)),
        identity
      )
    );
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
