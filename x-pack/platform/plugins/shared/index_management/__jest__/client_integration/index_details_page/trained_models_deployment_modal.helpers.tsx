/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { TrainedModelsDeploymentModalProps } from '../../../public/application/sections/home/index_list/details_page/trained_models_deployment_modal';
import { TrainedModelsDeploymentModal } from '../../../public/application/sections/home/index_list/details_page/trained_models_deployment_modal';
import type { State } from '../../../public/application/components/mappings_editor/types';

export const defaultState: Pick<State, 'inferenceToModelIdMap' | 'fields' | 'mappingViewFields'> = {
  inferenceToModelIdMap: {
    e5: {
      isDeployed: false,
      isDeployable: true,
      isDownloading: false,
      trainedModelId: '.multilingual-e5-small',
    },
    elser_model_2: {
      isDeployed: false,
      isDeployable: true,
      isDownloading: false,
      trainedModelId: '.elser_model_2',
    },
    openai: {
      isDeployed: false,
      isDeployable: false,
      isDownloading: false,
      trainedModelId: '',
    },
    my_elser_endpoint: {
      isDeployed: false,
      isDeployable: true,
      isDownloading: false,
      trainedModelId: '.elser_model_2',
    },
  },
  fields: {
    aliases: {},
    byId: {},
    rootLevelFields: [],
    maxNestedDepth: 0,
  },
  mappingViewFields: { byId: {}, rootLevelFields: [], aliases: {}, maxNestedDepth: 0 },
};

export const setErrorsInTrainedModelDeployment = jest.fn().mockReturnValue(undefined);
export const saveMappings = jest.fn().mockReturnValue(undefined);
export const forceSaveMappings = jest.fn().mockReturnValue(undefined);

export const exists = (testId: string): boolean => screen.queryByTestId(testId) !== null;

export const getTextContent = (testId: string): string => {
  const el = screen.queryByTestId(testId);
  return el?.textContent || '';
};

export const renderTrainedModelsDeploymentModal = (
  props: Partial<TrainedModelsDeploymentModalProps>
) => {
  return render(
    <TrainedModelsDeploymentModal
      errorsInTrainedModelDeployment={{}}
      saveMappings={saveMappings}
      forceSaveMappings={forceSaveMappings}
      saveMappingsLoading={false}
      setErrorsInTrainedModelDeployment={() => undefined}
      {...props}
    />
  );
};
