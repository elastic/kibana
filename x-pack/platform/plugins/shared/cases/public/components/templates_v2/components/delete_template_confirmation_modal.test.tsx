/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { DeleteTemplateConfirmationModal } from './delete_template_confirmation_modal';
import { renderWithTestingProviders } from '../../../common/mock';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('DeleteTemplateConfirmationModal', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const onCancel = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
    apiMock.getTemplatesUsage.mockResolvedValue({ total: 0, cases: [] });
    apiMock.bulkExportTemplates.mockResolvedValue({ filename: 'f.yaml', content: 'c' });
  });

  const renderModal = () =>
    renderWithTestingProviders(
      <DeleteTemplateConfirmationModal
        title="Delete template?"
        templateIds={['tpl-1']}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

  it('always warns that cases are unlinked but keep their field values', async () => {
    renderModal();
    expect(await screen.findByTestId('delete-template-unlink-warning')).toBeInTheDocument();
  });

  it('shows "no cases" when nothing uses the template', async () => {
    renderModal();
    expect(await screen.findByTestId('delete-template-no-affected-cases')).toBeInTheDocument();
  });

  it('lists affected cases and surfaces the capped remainder as a count', async () => {
    apiMock.getTemplatesUsage.mockResolvedValue({
      total: 3,
      cases: [
        { id: 'c1', title: 'Case One' },
        { id: 'c2', title: 'Case Two' },
      ],
    });

    renderModal();

    expect(await screen.findByText('Case One')).toBeInTheDocument();
    expect(screen.getByText('Case Two')).toBeInTheDocument();
    // total (3) exceeds listed (2) → surface the extra as "and 1 more case".
    expect(screen.getByText('and 1 more case')).toBeInTheDocument();
  });

  it('downloads the template before deleting when requested', async () => {
    renderModal();

    await user.click(await screen.findByTestId('delete-template-download-first'));

    await waitFor(() => {
      expect(apiMock.bulkExportTemplates).toHaveBeenCalledWith({ templateIds: ['tpl-1'] });
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('invokes confirm and cancel callbacks', async () => {
    renderModal();

    await user.click(await screen.findByTestId('confirmModalConfirmButton'));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByTestId('confirmModalCancelButton'));
    expect(onCancel).toHaveBeenCalled();
  });
});
