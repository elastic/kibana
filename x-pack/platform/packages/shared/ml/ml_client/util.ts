/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { TrainedModelJob } from '@kbn/ml-saved-objects/service';

export function getJobDetailsFromTrainedModel(
  model: estypes.MlTrainedModelConfig | estypes.MlPutTrainedModelRequest['body']
): TrainedModelJob | null {
  // @ts-ignore types are wrong
  if (model.metadata?.analytics_config === undefined) {
    return null;
  }

  // @ts-ignore types are wrong
  const jobId: string = model.metadata.analytics_config.id;
  // @ts-ignore types are wrong
  const createTime: number = model.metadata.analytics_config.create_time;
  return { job_id: jobId, create_time: createTime };
}
