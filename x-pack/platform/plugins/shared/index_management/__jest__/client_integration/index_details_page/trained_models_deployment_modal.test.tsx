/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import * as mappingsContext from '../../../public/application/components/mappings_editor/mappings_state_context';
import type {
  NormalizedField,
  State,
} from '../../../public/application/components/mappings_editor/types';
import {
  defaultState,
  exists,
  forceSaveMappings,
  getTextContent,
  renderTrainedModelsDeploymentModal,
  saveMappings,
  setErrorsInTrainedModelDeployment,
} from './trained_models_deployment_modal.helpers';

jest.mock('../../../public/hooks/use_ml_model_status_toasts', () => ({
  useMLModelNotificationToasts: jest.fn().mockReturnValue({
    showErrorToasts: jest.fn(),
  }),
}));

jest.mock('../../../public/application/app_context', () => ({
  useAppContext: jest.fn().mockReturnValue({
    url: undefined,
    plugins: {
      ml: {
        mlApi: {
          trainedModels: {
            getModelsDownloadStatus: jest.fn().mockResolvedValue({}),
            getTrainedModels: jest.fn().mockResolvedValue([
              {
                model_id: '.elser_model_2',
                model_type: 'pytorch',
                model_package: {
                  packaged_model_id: 'elser_model_2',
                  model_repository: 'https://ml-models.elastic.co',
                  minimum_version: '11.0.0',
                  size: 438123914,
                  sha256: '',
                  metadata: {},
                  tags: [],
                  vocabulary_file: 'elser_model_2.vocab.json',
                },
                description: 'Elastic Learned Sparse EncodeR v2',
                tags: ['elastic'],
              },
            ]),
            getTrainedModelStats: jest.fn().mockResolvedValue({
              count: 1,
              trained_model_stats: [
                {
                  model_id: '.elser_model_2',

                  deployment_stats: {
                    deployment_id: 'elser_model_2',
                    model_id: '.elser_model_2',
                    threads_per_allocation: 1,
                    number_of_allocations: 1,
                    queue_capacity: 1024,
                    state: 'started',
                  },
                },
              ],
            }),
          },
        },
      },
    },
  }),
}));

jest.mock('../../../public/application/components/mappings_editor/mappings_state_context');

const mappingsContextMocked = jest.mocked(mappingsContext);

describe('When semantic_text is enabled', () => {
  const renderModal = renderTrainedModelsDeploymentModal;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When there are no pending deployments and no errors in the model deployment', () => {
    beforeEach(() => {
      mappingsContextMocked.useMappingsState.mockReturnValue(defaultState as unknown as State);
    });

    it('should not display the modal', () => {
      renderModal({
        errorsInTrainedModelDeployment: {},
        saveMappings,
        forceSaveMappings,
        setErrorsInTrainedModelDeployment: () => undefined,
      });

      expect(exists('trainedModelsDeploymentModal')).toBe(false);
    });
  });

  describe('When there are pending deployments in the model deployment', () => {
    beforeEach(() => {
      mappingsContextMocked.useMappingsState.mockReturnValue({
        ...defaultState,
        fields: {
          ...defaultState.fields,
          byId: {
            new_field: {
              id: 'new_field',
              isMultiField: false,
              path: ['new_field'],
              source: {
                name: 'new_field',
                type: 'semantic_text',
                reference_field: 'title',
                inference_id: 'elser_model_2',
              },
            } as NormalizedField,
          },
          rootLevelFields: ['new_field'],
        },
      } as unknown as State);
    });

    it('should display the modal', () => {
      renderModal({
        errorsInTrainedModelDeployment: {},
        forceSaveMappings,
        saveMappings,
        setErrorsInTrainedModelDeployment,
      });

      expect(exists('trainedModelsDeploymentModal')).toBe(true);
    });

    it('should contain content related to semantic_text', () => {
      renderModal({
        errorsInTrainedModelDeployment: {},
        forceSaveMappings,
        saveMappings,
        setErrorsInTrainedModelDeployment,
      });

      expect(getTextContent('trainedModelsDeploymentModalText')).toContain(
        'Some fields are referencing models'
      );
    });

    it('should call saveMappings if refresh button is pressed', async () => {
      renderModal({
        errorsInTrainedModelDeployment: {},
        forceSaveMappings,
        saveMappings,
        setErrorsInTrainedModelDeployment,
      });

      const tryAgainButton = screen.getByTestId('tryAgainModalButton');
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(saveMappings.mock.calls).toHaveLength(1);
      });
    });

    it('should disable the force save mappings button if checkbox is not checked', () => {
      renderModal({
        errorsInTrainedModelDeployment: {},
        forceSaveMappings,
        saveMappings,
        setErrorsInTrainedModelDeployment,
      });

      const forceSaveButton = screen.getByTestId('forceSaveMappingsButton');
      expect(forceSaveButton).toBeDisabled();
    });

    it('checking checkbox should enable force save mappings button', async () => {
      renderModal({
        errorsInTrainedModelDeployment: {},
        forceSaveMappings,
        saveMappings,
        setErrorsInTrainedModelDeployment,
      });

      const checkbox = screen.getByTestId('allowForceSaveMappingsCheckbox');
      fireEvent.click(checkbox);

      const forceSaveButton = screen.getByTestId('forceSaveMappingsButton');
      expect(forceSaveButton).not.toBeDisabled();

      fireEvent.click(forceSaveButton);

      await waitFor(() => {
        expect(forceSaveMappings.mock.calls).toHaveLength(1);
      });
    });
  });

  describe('When there is error in the model deployment', () => {
    beforeEach(() => {
      mappingsContextMocked.useMappingsState.mockReturnValue({
        ...defaultState,
        fields: {
          ...defaultState.fields,
          byId: {
            new_field: {
              id: 'new_field',
              isMultiField: false,
              path: ['new_field'],
              source: {
                name: 'new_field',
                type: 'semantic_text',
                reference_field: 'title',
                inference_id: 'elser_model_2',
              },
            } as NormalizedField,
          },
          rootLevelFields: ['new_field'],
        },
      } as unknown as State);
    });

    it('should display text related to errored deployments', () => {
      renderModal({
        errorsInTrainedModelDeployment: { elser_model_2: 'Error' },
        saveMappings,
        forceSaveMappings,
        setErrorsInTrainedModelDeployment,
      });

      expect(getTextContent('trainedModelsDeploymentModalText')).toContain('There was an error');
    });

    it('should display only the errored deployment', () => {
      renderModal({
        errorsInTrainedModelDeployment: { elser_model_2: 'Error' },
        saveMappings,
        forceSaveMappings,
        setErrorsInTrainedModelDeployment,
      });

      const modal = screen.getByTestId('trainedModelsDeploymentModal');
      expect(modal.textContent).toContain('elser_model_2');
      expect(modal.textContent).not.toContain('valid-model');
    });

    it("should call refresh method if 'Try again' button is pressed", async () => {
      renderModal({
        errorsInTrainedModelDeployment: { elser_model_2: 'Error' },
        saveMappings,
        forceSaveMappings,
        setErrorsInTrainedModelDeployment,
      });

      const tryAgainButton = screen.getByTestId('tryAgainModalButton');
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(saveMappings.mock.calls).toHaveLength(1);
      });
    });
  });
});
