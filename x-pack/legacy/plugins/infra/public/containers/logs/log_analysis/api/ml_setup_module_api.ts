/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { kfetch } from 'ui/kfetch';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { getJobIdPrefix } from '../../../../../common/log_analysis';
import { jobCustomSettingsRT } from './ml_api_types';

export const callSetupMlModuleAPI = async (
  moduleId: string,
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
    pathname: `/api/ml/modules/setup/${moduleId}`,
    body: JSON.stringify(
      setupMlModuleRequestPayloadRT.encode({
        start,
        end,
        indexPatternName: indexPattern,
        prefix: getJobIdPrefix(spaceId, sourceId),
        startDatafeed: true,
        jobOverrides: [
          {
            job_id: 'log-entry-rate' as const,
            analysis_config: {
              bucket_span: `${bucketSpan}ms`,
            },
            data_description: {
              time_field: timeField,
            },
            custom_settings: {
              logs_source_config: {
                indexPattern,
                timestampField: timeField,
                bucketSpan,
              },
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

const setupMlModuleLogEntryRateJobOverridesRT = rt.type({
  job_id: rt.literal('log-entry-rate'),
  analysis_config: rt.type({
    bucket_span: rt.string,
  }),
  data_description: rt.type({
    time_field: rt.string,
  }),
  custom_settings: jobCustomSettingsRT,
});

const setupMlModuleRequestParamsRT = rt.type({
  indexPatternName: rt.string,
  prefix: rt.string,
  startDatafeed: rt.boolean,
  jobOverrides: rt.array(setupMlModuleLogEntryRateJobOverridesRT),
  datafeedOverrides: rt.array(rt.object),
});

const setupMlModuleRequestPayloadRT = rt.intersection([
  setupMlModuleTimeParamsRT,
  setupMlModuleRequestParamsRT,
]);

const setupErrorResponseRT = rt.type({
  msg: rt.string,
});

const datafeedSetupResponseRT = rt.intersection([
  rt.type({
    id: rt.string,
    started: rt.boolean,
    success: rt.boolean,
  }),
  rt.partial({
    error: setupErrorResponseRT,
  }),
]);

const jobSetupResponseRT = rt.intersection([
  rt.type({
    id: rt.string,
    success: rt.boolean,
  }),
  rt.partial({
    error: setupErrorResponseRT,
  }),
]);

const setupMlModuleResponsePayloadRT = rt.type({
  datafeeds: rt.array(datafeedSetupResponseRT),
  jobs: rt.array(jobSetupResponseRT),
});

export type SetupMlModuleResponsePayload = rt.TypeOf<typeof setupMlModuleResponsePayloadRT>;
