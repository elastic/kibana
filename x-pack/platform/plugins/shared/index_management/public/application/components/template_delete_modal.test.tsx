/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TemplateDeleteModal } from './template_delete_modal';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

// `../services/api` pulls the whole HTTP service graph in at import time; the delete
// request itself is covered by the index templates client integration suite.
jest.mock('../services/api', () => ({
  deleteTemplates: jest.fn(),
}));

jest.mock('../app_context', () => ({
  useServices: () => ({
    notificationService: {
      showSuccessToast: jest.fn(),
      showDangerToast: jest.fn(),
    },
  }),
}));

describe('TemplateDeleteModal', () => {
  const renderModal = (templatesToDelete: Array<{ name: string; type?: string }>) =>
    render(<TemplateDeleteModal templatesToDelete={templatesToDelete} callback={jest.fn()} />);

  it('warns and blocks confirmation when a system template is selected', () => {
    renderModal([{ name: '.my-system-template', type: 'system' }]);

    expect(screen.getByTestId('deleteSystemTemplateCallOut')).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();
  });

  it('unblocks confirmation once the system template consequences are acknowledged', () => {
    renderModal([{ name: '.my-system-template', type: 'system' }]);

    fireEvent.click(screen.getByLabelText(/I understand the consequences/));

    expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });

  it('does not warn when no system template is selected', () => {
    renderModal([{ name: 'my-template' }]);

    expect(screen.queryByTestId('deleteSystemTemplateCallOut')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });
});
