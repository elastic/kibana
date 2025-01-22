/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Form,
  useForm,
} from '../../../public/application/components/mappings_editor/shared_imports';
import { findTestSubject, registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import {
  SelectInferenceId,
  SelectInferenceIdProps,
} from '../../../public/application/components/mappings_editor/components/document_fields/field_parameters/select_inference_id';
import React from 'react';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

const createInferenceEndpointMock = jest.fn();
const mockDispatch = jest.fn();
const INFERENCE_LOCATOR = 'SEARCH_INFERENCE_ENDPOINTS';
const createMockLocator = (id: string) => ({
  useUrl: jest.fn().mockReturnValue('https://redirect.me/to/inference_endpoints'),
});
const mockInferenceManagementLocator = createMockLocator(INFERENCE_LOCATOR);

jest.mock('../../../public/application/app_context', () => ({
  useAppContext: jest.fn().mockReturnValue({
    core: {
      application: {},
      http: {
        basePath: {
          get: jest.fn().mockReturnValue('/base-path'),
        },
      },
    },
    docLinks: {
      links: {
        inferenceManagement: {
          inferenceAPIDocumentation: 'https://abc.com/inference-api-create',
        },
      },
    },
    plugins: {
      ml: {
        mlApi: {
          trainedModels: {
            getTrainedModels: jest.fn().mockResolvedValue([]),
            getTrainedModelStats: jest.fn().mockResolvedValue([]),
          },
        },
      },
      share: {
        url: {
          locators: {
            get: jest.fn((id) => {
              switch (id) {
                case INFERENCE_LOCATOR:
                  return mockInferenceManagementLocator;
                default:
                  throw new Error(`Unknown locator id: ${id}`);
              }
            }),
          },
        },
      },
    },
  }),
}));

jest.mock(
  '../../../public/application/components/component_templates/component_templates_context',
  () => ({
    useComponentTemplatesContext: jest.fn().mockReturnValue({
      toasts: {
        addError: jest.fn(),
        addSuccess: jest.fn(),
      },
    }),
  })
);

jest.mock('../../../public/application/components/mappings_editor/mappings_state_context', () => ({
  useMappingsState: () => ({ inferenceToModelIdMap: {} }),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../public/application/services/api', () => ({
  useLoadInferenceEndpoints: jest.fn().mockReturnValue({
    data: [
      { inference_id: '.preconfigured-elser', task_type: 'sparse_embedding' },
      { inference_id: '.preconfigured-e5', task_type: 'text_embedding' },
      { inference_id: 'endpoint-1', task_type: 'text_embedding' },
      { inference_id: 'endpoint-2', task_type: 'sparse_embedding' },
      { inference_id: 'endpoint-3', task_type: 'completion' },
    ] as InferenceAPIConfigResponse[],
    isLoading: false,
    error: null,
  }),
}));

function getTestForm(Component: React.FC<SelectInferenceIdProps>) {
  return (defaultProps: SelectInferenceIdProps) => {
    const { form } = useForm();
    form.setFieldValue('inference_id', '.preconfigured-elser');
    return (
      <Form form={form}>
        <Component {...(defaultProps as any)} />
      </Form>
    );
  };
}

describe('SelectInferenceId', () => {
  let exists: any;
  let find: any;

  beforeAll(async () => {
    const defaultProps: SelectInferenceIdProps = {
      'data-test-subj': 'data-inference-endpoint-list',
      createInferenceEndpoint: createInferenceEndpointMock,
    };
    const setup = registerTestBed(getTestForm(SelectInferenceId), {
      defaultProps,
      memoryRouter: { wrapComponent: false },
    });

    await act(async () => {
      const testBed = await setup();
      exists = testBed.exists;
      find = testBed.find;
    });
  });

  it('should display the select inference endpoint combo', () => {
    expect(exists('selectInferenceId')).toBe(true);
  });

  it('should contain the buttons for InferenceEndpoint management', () => {
    find('inferenceIdButton').simulate('click');
    expect(exists('learn-how-to-create-inference-endpoints')).toBe(true);
    expect(exists('manageInferenceEndpointButton')).toBe(true);
  });

  it('should display the inference endpoints in the combo', () => {
    find('inferenceIdButton').simulate('click');
    expect(find('data-inference-endpoint-list').contains('.preconfigured-elser')).toBe(true);
    expect(find('data-inference-endpoint-list').contains('.preconfigured-e5')).toBe(true);
    expect(find('data-inference-endpoint-list').contains('endpoint-1')).toBe(true);
    expect(find('data-inference-endpoint-list').contains('endpoint-2')).toBe(true);
    expect(find('data-inference-endpoint-list').contains('endpoint-3')).toBe(false);
  });

  it('select the first endpoint by default', () => {
    find('inferenceIdButton').simulate('click');
    const defaultElser = findTestSubject(
      find('data-inference-endpoint-list'),
      'custom-inference_.preconfigured-elser'
    );
    expect(defaultElser.prop('aria-checked')).toEqual(true);
  });

  it('does not select the other endpoints by default', () => {
    find('inferenceIdButton').simulate('click');
    const defaultE5 = findTestSubject(
      find('data-inference-endpoint-list'),
      'custom-inference_.preconfigured-e5'
    );
    expect(defaultE5.prop('aria-checked')).toEqual(false);

    const endpoint1 = findTestSubject(
      find('data-inference-endpoint-list'),
      'custom-inference_endpoint-1'
    );
    expect(endpoint1.prop('aria-checked')).toEqual(false);

    const endpoint2 = findTestSubject(
      find('data-inference-endpoint-list'),
      'custom-inference_endpoint-2'
    );
    expect(endpoint2.prop('aria-checked')).toEqual(false);
  });
});
