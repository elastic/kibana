/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { kfetch } from 'ui/kfetch';

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { getJobIdPrefix } from '../../../../../common/log_analysis';

const MODULE_ID = 'logs_ui_analysis';

// This is needed due to: https://github.com/elastic/kibana/issues/43671
const removeSampleDataIndex = (indexPattern: string) => {
  const SAMPLE_DATA_INDEX = 'kibana_sample_data_logs*';
  return indexPattern
    .split(',')
    .filter(index => index !== SAMPLE_DATA_INDEX)
    .join(',');
};

export const callSetupMlModuleAPI = async (
  start: number | undefined,
  end: number | undefined,
  spaceId: string,
  sourceId: string,
  indexPattern: string,
  timeField: string,
  bucketSpan: number
) => {
  const response = await kfetch({
    method: 'POST',
    pathname: `/api/ml/modules/setup/${MODULE_ID}`,
    body: JSON.stringify(
      setupMlModuleRequestPayloadRT.encode({
        start,
        end,
        indexPatternName: removeSampleDataIndex(indexPattern),
        prefix: getJobIdPrefix(spaceId, sourceId),
        startDatafeed: true,
        jobOverrides: [
          {
            job_id: 'log-entry-rate',
            analysis_config: {
              bucket_span: `${bucketSpan}ms`,
            },
            data_description: {
              time_field: timeField,
            },
          },
        ],
        datafeedOverrides: [],
      })
    ),
  });

  return pipe(
    setupMlModuleResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

const setupMlModuleTimeParamsRT = rt.partial({
  start: rt.number,
  end: rt.number,
});

const setupMlModuleRequestParamsRT = rt.type({
  indexPatternName: rt.string,
  prefix: rt.string,
  startDatafeed: rt.boolean,
  jobOverrides: rt.array(rt.object),
  datafeedOverrides: rt.array(rt.object),
});

const setupMlModuleRequestPayloadRT = rt.intersection([
  setupMlModuleTimeParamsRT,
  setupMlModuleRequestParamsRT,
]);

const setupMlModuleResponsePayloadRT = rt.type({
  datafeeds: rt.array(
    rt.type({
      id: rt.string,
      started: rt.boolean,
      success: rt.boolean,
      error: rt.any,
    })
  ),
  jobs: rt.array(
    rt.type({
      id: rt.string,
      success: rt.boolean,
      error: rt.any,
    })
  ),
});

export type SetupMlModuleResponsePayload = rt.TypeOf<typeof setupMlModuleResponsePayloadRT>;
