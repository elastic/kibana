/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import type { TrainedModelItem } from '../../../../common/types/trained_models';
import {
  type TestTrainedModelsContextType,
  TestTrainedModelsContext,
} from './test_trained_models_context';
import { TestTrainedModelFlyout } from './test_flyout';
import { CreatePipelineForModelFlyout } from '../create_pipeline_for_model/create_pipeline_for_model_flyout';

interface Props {
  model: TrainedModelItem;
  onClose: (refreshList?: boolean) => void;
}
export const TestModelAndPipelineCreationFlyout: FC<Props> = ({ model, onClose }) => {
  const [currentContext, setCurrentContext] = useState<TestTrainedModelsContextType>({
    pipelineConfig: undefined,
    createPipelineFlyoutOpen: false,
  });

  return (
    <TestTrainedModelsContext.Provider value={{ currentContext, setCurrentContext }}>
      {currentContext.createPipelineFlyoutOpen === false ? (
        <TestTrainedModelFlyout model={model} onClose={onClose} />
      ) : (
        <CreatePipelineForModelFlyout model={model} onClose={onClose} />
      )}
    </TestTrainedModelsContext.Provider>
  );
};
