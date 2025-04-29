/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEPLOYMENT_STATE, MODEL_STATE, type ModelState } from '@kbn/ml-trained-models-utils';
import type { NLPModelItem } from '../../../common/types/trained_models';

/**
 * Resolves result model state based on the state of each deployment.
 *
 * If at least one deployment is in the STARTED state, the model state is STARTED.
 * Then if none of the deployments are in the STARTED state, but at least one is in the STARTING state, the model state is STARTING.
 * If all deployments are in the STOPPING state, the model state is STOPPING.
 */
export const getModelDeploymentState = (model: NLPModelItem): ModelState | undefined => {
  if (!model.stats?.deployment_stats?.length) return;

  if (model.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTED)) {
    return MODEL_STATE.STARTED;
  }
  if (model.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTING)) {
    return MODEL_STATE.STARTING;
  }
  if (model.stats?.deployment_stats?.every((v) => v.state === DEPLOYMENT_STATE.STOPPING)) {
    return MODEL_STATE.STOPPING;
  }
};
