/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { CreateTemplateModal } from './create_template_modal';
import * as i18n from '../translations';

const EMPTY_METADATA = { name: '', description: '', tags: [] };

describe('CreateTemplateModal', () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not open pre-flagged with errors', () => {
    renderWithTestingProviders(
      <CreateTemplateModal
        initialMetadata={EMPTY_METADATA}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.queryByText(i18n.TEMPLATE_NAME_REQUIRED)).not.toBeInTheDocument();
  });

  it('surfaces the required name instead of silently refusing to continue', async () => {
    renderWithTestingProviders(
      <CreateTemplateModal
        initialMetadata={EMPTY_METADATA}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    await userEvent.click(screen.getByTestId('createTemplateModalConfirm'));

    expect(await screen.findByText(i18n.TEMPLATE_NAME_REQUIRED)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('normalizes the metadata it hands back', async () => {
    renderWithTestingProviders(
      <CreateTemplateModal
        initialMetadata={EMPTY_METADATA}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    await userEvent.type(screen.getByTestId('templateMetadataNameInput'), '  Ransomware  ');
    await userEvent.click(screen.getByTestId('createTemplateModalConfirm'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ransomware', description: '', tags: [] })
    );
  });

  it('seeds from an in-progress draft so a returning user does not retype', () => {
    renderWithTestingProviders(
      <CreateTemplateModal
        initialMetadata={{ name: 'Draft name', description: 'Draft description', tags: [] }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByTestId('templateMetadataNameInput')).toHaveValue('Draft name');
  });

  it('cancels without handing anything back', async () => {
    renderWithTestingProviders(
      <CreateTemplateModal
        initialMetadata={EMPTY_METADATA}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    await userEvent.click(screen.getByTestId('createTemplateModalCancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
