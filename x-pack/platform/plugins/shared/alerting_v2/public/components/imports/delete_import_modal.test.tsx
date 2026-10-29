/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { DeleteImportModal } from './delete_import_modal';

const renderModal = ({ isManaged = false }: { isManaged?: boolean } = {}) => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <I18nProvider>
      <DeleteImportModal
        importName="Datadog"
        isManaged={isManaged}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nProvider>
  );
  return { onConfirm, onCancel };
};

describe('DeleteImportModal', () => {
  it('also deletes the connector and workflow by default', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    expect(screen.getByTestId('importsDeleteResourcesCheckbox')).toBeChecked();
    await user.click(screen.getByText('Delete', { selector: 'button *' }));

    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('keeps the connector and workflow when the box is cleared', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(screen.getByTestId('importsDeleteResourcesCheckbox'));
    await user.click(screen.getByText('Delete', { selector: 'button *' }));

    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  describe('managed import', () => {
    it('keeps the connector by default and never mentions the shared workflow as deletable', async () => {
      const user = userEvent.setup();
      const { onConfirm } = renderModal({ isManaged: true });

      expect(screen.getByTestId('importsDeleteResourcesCheckbox')).not.toBeChecked();
      expect(screen.getByText('Also delete the connector')).toBeInTheDocument();
      await user.click(screen.getByText('Delete', { selector: 'button *' }));

      expect(onConfirm).toHaveBeenCalledWith(false);
    });

    it('deletes the connector when the box is checked', async () => {
      const user = userEvent.setup();
      const { onConfirm } = renderModal({ isManaged: true });

      await user.click(screen.getByTestId('importsDeleteResourcesCheckbox'));
      await user.click(screen.getByText('Delete', { selector: 'button *' }));

      expect(onConfirm).toHaveBeenCalledWith(true);
    });
  });

  it('cancels', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderModal();

    await user.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
