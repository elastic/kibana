/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as mappingsContext from '../../../../../components/mappings_editor/mappings_state_context';
import {
  deNormalize,
  prepareFieldsForEisUpdate,
  isElserOnMlNodeSemanticField,
} from '../../../../../components/mappings_editor/lib/utils';
import * as apiService from '../../../../../services/api';
import { notificationService } from '../../../../../services/notification';
import type { NormalizedFields, State } from '../../../../../components/mappings_editor/types';
import { UpdateElserMappingsModal } from './update_elser_mappings_modal';
import {
  createMappingViewFieldsFixture,
  defaultDenormalizedMappings,
  refetchMapping,
  setIsModalOpen,
} from './update_elser_mappings_modal.test_helpers';

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
const updateIndexMappingsMock = jest.mocked(apiService.updateIndexMappings);

const renderEisUpdateCallout = ({
  hasUpdatePrivileges = true,
}: {
  hasUpdatePrivileges?: boolean;
} = {}) => {
  return render(
    <UpdateElserMappingsModal
      indexName="test-index"
      refetchMapping={refetchMapping}
      setIsModalOpen={setIsModalOpen}
      hasUpdatePrivileges={hasUpdatePrivileges}
      modalId="test-modal-id"
    />
  );
};

describe('UpdateElserMappingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const fieldsById: NormalizedFields = createMappingViewFieldsFixture();

    mappingsContextMock.useMappingsState.mockReturnValue({
      mappingViewFields: fieldsById,
    } as unknown as State);

    isElserOnMlNodeSemanticFieldMock.mockImplementation((field) => {
      return field.source.inference_id === '.elser-2-elasticsearch';
    });

    prepareFieldsForEisUpdateMock.mockReturnValue(fieldsById);

    deNormalizeMock.mockReturnValue(defaultDenormalizedMappings);
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
