/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as mappingsContext from '../../../../../components/mappings_editor/mappings_state_context';
import {
  deNormalize,
  prepareFieldsForEisUpdate,
  isElserOnMlNodeSemanticField,
} from '../../../../../components/mappings_editor/lib/utils';
import {
  UpdateElserMappingsModal,
  type UpdateElserMappingsModalProps,
} from './update_elser_mappings_modal';
import * as apiService from '../../../../../services/api';
import { notificationService } from '../../../../../services/notification';
import type { NormalizedFields } from '../../../../../components/mappings_editor/types';

jest.mock('../../../../../components/mappings_editor/lib/utils', () => ({
  deNormalize: jest.fn(),
  prepareFieldsForEisUpdate: jest.fn(),
  isElserOnMlNodeSemanticField: jest.fn(),
  getFieldConfig: jest.fn(() => ({
    serializer: jest.fn(),
    deserializer: jest.fn(),
  })),
}));

jest.mock('../../../../../components/mappings_editor/mappings_state_context');

jest.mock('../../../../../services/api', () => ({
  updateIndexMappings: jest.fn(),
}));

jest.mock('../../../../../services', () => ({
  documentationService: {
    docLinks: {
      enterpriseSearch: {
        elasticInferenceService: 'http://example.com/docs',
      },
    },
  },
}));

jest.mock('../../../../../services/notification', () => ({
  notificationService: { showSuccessToast: jest.fn(), showDangerToast: jest.fn() },
}));

const deNormalizeMock = jest.mocked(deNormalize);
const prepareFieldsForEisUpdateMock = jest.mocked(prepareFieldsForEisUpdate);
const isElserOnMlNodeSemanticFieldMock = jest.mocked(isElserOnMlNodeSemanticField);
const mappingsContextMock = jest.mocked(mappingsContext);
const notificationServiceMock = jest.mocked(notificationService);
const updateIndexMappingsMock = apiService.updateIndexMappings as jest.MockedFunction<
  typeof apiService.updateIndexMappings
>;

const setIsModalOpen = jest.fn();
const refetchMapping = jest.fn();

const renderEisUpdateCallout = (props?: Partial<UpdateElserMappingsModalProps>) => {
  return render(
    <IntlProvider>
      <UpdateElserMappingsModal
        indexName="test-index"
        setIsModalOpen={setIsModalOpen}
        refetchMapping={refetchMapping}
        hasUpdatePrivileges={props?.hasUpdatePrivileges ?? true}
        modalId="testModal"
      />
    </IntlProvider>
  );
};

describe('UpdateElserMappingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const fieldsById: NormalizedFields = {
      byId: {
        first: {
          id: 'first',
          nestedDepth: 0,
          isMultiField: false,
          path: ['name'],
          source: { name: 'name', type: 'semantic_text', inference_id: '.elser-2-elasticsearch' },
          childFieldsName: 'fields',
          canHaveChildFields: false,
          hasChildFields: false,
          canHaveMultiFields: true,
          hasMultiFields: false,
          isExpanded: false,
        },
        second: {
          id: 'second',
          nestedDepth: 0,
          isMultiField: false,
          path: ['text'],
          source: { name: 'text', type: 'semantic_text', inference_id: '.elser-2-elasticsearch' },
          childFieldsName: 'fields',
          canHaveChildFields: false,
          hasChildFields: false,
          canHaveMultiFields: true,
          hasMultiFields: false,
          isExpanded: false,
        },
      },
      aliases: {},
      rootLevelFields: ['first', 'second'],
      maxNestedDepth: 0,
    };

    mappingsContextMock.useMappingsState.mockReturnValue({
      mappingViewFields: fieldsById,
    } as any);

    isElserOnMlNodeSemanticFieldMock.mockImplementation((field) => {
      return field.source.inference_id === '.elser-2-elasticsearch';
    });

    prepareFieldsForEisUpdateMock.mockReturnValue(fieldsById);

    deNormalizeMock.mockReturnValue({
      name: {
        type: 'semantic_text',
        inference_id: '.elser-2-elastic',
      },
      text: {
        type: 'semantic_text',
        inference_id: '.elser-2-elastic',
      },
    });
  });

  it('should render modal and load options', () => {
    renderEisUpdateCallout();

    expect(screen.getByTestId('updateElserMappingsModal')).toBeInTheDocument();
    expect(screen.getByTestId('updateElserMappingsSelect')).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'name' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'text' })).toBeInTheDocument();

    const badges = screen.getAllByText('.elser-2-elasticsearch');
    expect(badges).toHaveLength(2);
  });

  it('should disable Apply button if no options are checked', () => {
    renderEisUpdateCallout();
    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    expect(applyBtn).toBeDisabled();
  });

  it('should enable Apply button when at least one option is checked', async () => {
    renderEisUpdateCallout();
    const selectable = screen.getByTestId('updateElserMappingsSelect');
    const firstOption = within(selectable).getByRole('option', { name: 'name' });
    await userEvent.click(firstOption);

    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    expect(applyBtn).toBeEnabled();
  });

  it('should disable Apply if hasUpdatePrivileges is false', () => {
    renderEisUpdateCallout({ hasUpdatePrivileges: false });
    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    expect(applyBtn).toBeDisabled();
  });

  it('should call API and close modal on successful Apply', async () => {
    renderEisUpdateCallout();

    const selectable = screen.getByTestId('updateElserMappingsSelect');
    const firstOption = within(selectable).getByRole('option', { name: 'name' });
    await userEvent.click(firstOption);

    updateIndexMappingsMock.mockResolvedValue({ error: null, data: null });

    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    await userEvent.click(applyBtn);

    expect(updateIndexMappingsMock).toHaveBeenCalledTimes(1);
    expect(notificationServiceMock.showSuccessToast).toHaveBeenCalledTimes(1);
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
    expect(refetchMapping).toHaveBeenCalled();
  });

  it('should display error message if API fails', async () => {
    renderEisUpdateCallout();

    const selectable = screen.getByTestId('updateElserMappingsSelect');
    const firstOption = within(selectable).getByRole('option', { name: 'name' });
    await userEvent.click(firstOption);

    const errorMessage = 'Something has gone wrong';
    updateIndexMappingsMock.mockResolvedValue({
      error: { message: errorMessage, error: errorMessage },
      data: null,
    });

    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    await userEvent.click(applyBtn);

    expect(updateIndexMappingsMock).toHaveBeenCalledTimes(1);
    expect(notificationServiceMock.showDangerToast).toHaveBeenCalledTimes(1);
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it('should close modal when Cancel button is clicked', async () => {
    renderEisUpdateCallout();
    const cancelBtn = screen.getByTestId('UpdateElserMappingsModalCancelBtn');
    await userEvent.click(cancelBtn);
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });
});
