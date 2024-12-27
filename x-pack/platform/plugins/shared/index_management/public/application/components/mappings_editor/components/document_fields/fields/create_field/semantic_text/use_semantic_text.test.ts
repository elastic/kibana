/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SemanticTextField } from '../../../../../types';
import { useSemanticText } from './use_semantic_text';
import { act } from 'react-dom/test-utils';

jest.mock('../../../../../../../../hooks/use_details_page_mappings_model_management', () => ({
  useDetailsPageMappingsModelManagement: () => ({
    fetchInferenceToModelIdMap: () => ({
      '.preconfigured_elser': {
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.elser_model_2',
      },
      '.preconfigured_e5': {
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.multilingual-e5-small',
      },
      openai: {
        isDeployed: false,
        isDeployable: false,
        trainedModelId: '',
      },
      my_elser_endpoint: {
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.elser_model_2',
      },
    }),
  }),
}));

const mockField: Record<string, SemanticTextField> = {
  elser_model_2: {
    name: 'name',
    type: 'semantic_text',
    inference_id: '.preconfigured_elser',
    reference_field: 'title',
  },
  e5: {
    name: 'name',
    type: 'semantic_text',
    inference_id: '.preconfigured_e5',
    reference_field: 'title',
  },
  openai: {
    name: 'name',
    type: 'semantic_text',
    inference_id: 'openai',
    reference_field: 'title',
  },
  my_elser_endpoint: {
    name: 'name',
    type: 'semantic_text',
    inference_id: 'my_elser_endpoint',
    reference_field: 'title',
  },
};

const mockDispatch = jest.fn();

jest.mock('../../../../../mappings_state_context', () => ({
  useMappingsState: jest.fn().mockReturnValue({
    inferenceToModelIdMap: {
      '.preconfigured_elser': {
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.elser_model_2',
      },
      '.preconfigured_e5': {
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.multilingual-e5-small',
      },
      openai: {
        isDeployed: false,
        isDeployable: false,
        trainedModelId: '',
      },
      my_elser_endpoint: {
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.elser_model_2',
      },
    },
    fields: {
      byId: {},
    },
    mappingViewFields: { byId: {} },
  }),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

jest.mock('../../../../../../../services/api', () => ({
  getInferenceEndpoints: jest.fn().mockResolvedValue({
    data: [
      {
        inference_id: '.preconfigured_e5',
        task_type: 'text_embedding',
        service: 'elasticsearch',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: '.multilingual-e5-small',
        },
        task_settings: {},
      },
    ],
  }),
}));

describe('useSemanticText', () => {
  let mockForm: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockForm = {
      form: {
        getFormData: jest.fn().mockReturnValue({
          referenceField: 'title',
          name: 'sem',
          type: 'semantic_text',
          inferenceId: 'e5',
        }),
        setFieldValue: jest.fn(),
      },
      thirdPartyModel: {
        getFormData: jest.fn().mockReturnValue({
          referenceField: 'title',
          name: 'semantic_text_openai_endpoint',
          type: 'semantic_text',
          inferenceId: 'openai',
        }),
        setFieldValue: jest.fn(),
      },
      elasticModelEndpointCreatedfromFlyout: {
        getFormData: jest.fn().mockReturnValue({
          referenceField: 'title',
          name: 'semantic_text_elserServiceType_endpoint',
          type: 'semantic_text',
          inferenceId: 'my_elser_endpoint',
        }),
        setFieldValue: jest.fn(),
      },
    };
  });

  it('should handle semantic text correctly', async () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: mockForm.form,
        setErrorsInTrainedModelDeployment: jest.fn(),
      })
    );

    await act(async () => {
      result.current.handleSemanticText(mockField.elser_model_2);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.add',
      value: mockField.elser_model_2,
    });
  });

  it('handles errors correctly', async () => {
    const setErrorsInTrainedModelDeployment = jest.fn();

    const { result } = renderHook(() =>
      useSemanticText({ form: mockForm.form, setErrorsInTrainedModelDeployment })
    );

    await act(async () => {
      result.current.handleSemanticText(mockField.elser_model_2);
    });

    expect(setErrorsInTrainedModelDeployment).toHaveBeenCalledWith(expect.any(Function));
  });
});
