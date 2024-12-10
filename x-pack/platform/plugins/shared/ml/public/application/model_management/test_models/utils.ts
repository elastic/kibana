/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRAINED_MODEL_TYPE,
  DEPLOYMENT_STATE,
  SUPPORTED_PYTORCH_TASKS,
  type SupportedPytorchTasksType,
} from '@kbn/ml-trained-models-utils';
import type { TrainedModelUIItem } from '../../../../common/types/trained_models';
import {
  isDFAModelItem,
  isExistingModel,
  isNLPModelItem,
} from '../../../../common/types/trained_models';

const PYTORCH_TYPES = Object.values(SUPPORTED_PYTORCH_TASKS);

export function isTestable(modelItem: TrainedModelUIItem, checkForState = false) {
  if (
    isNLPModelItem(modelItem) &&
    PYTORCH_TYPES.includes(
      Object.keys(modelItem.inference_config ?? {})[0] as SupportedPytorchTasksType
    ) &&
    (checkForState === false ||
      modelItem.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTED))
  ) {
    return true;
  }

  if (isExistingModel(modelItem) && modelItem.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    return true;
  }

  return isDFAModelItem(modelItem);
}
