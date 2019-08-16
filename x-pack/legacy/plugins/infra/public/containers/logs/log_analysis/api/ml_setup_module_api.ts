/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { kfetch } from 'ui/kfetch';

import { getJobIdPrefix } from '../../../../../common/log_analysis';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

const MODULE_ID = 'logs_ui_analysis';

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
        indexPatternName: indexPattern,
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
        datafeedOverrides: [
          {
            job_id: 'log-entry-rate',
            aggregations: {
              buckets: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${bucketSpan}ms`,
                },
                aggregations: {
                  [timeField]: {
                    max: {
                      field: `${timeField}`,
                    },
                  },
                  doc_count_per_minute: {
                    bucket_script: {
                      script: {
                        params: {
                          bucket_span_in_ms: bucketSpan,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      })
    ),
  });

  return setupMlModuleResponsePayloadRT.decode(response).getOrElseL(throwErrors(createPlainError));
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
    })
  ),
  jobs: rt.array(
    rt.type({
      id: rt.string,
      success: rt.boolean,
    })
  ),
});

export type SetupMlModuleResponsePayload = rt.TypeOf<typeof setupMlModuleResponsePayloadRT>;
