/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeleteRuleModalProps } from './delete_rule_modal';
import { DeleteRuleModal } from './delete_rule_modal';

const renderModal = (props: Partial<DeleteRuleModalProps> = {}) => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const onRetryLoad = jest.fn();
  render(
    <DeleteRuleModal
      ruleName="product-catalog"
      type="indices"
      fallbacks={[
        { name: 'users' },
        {
          name: 'products',
          nextRuleName: 'catalog',
          nextProfileName: 'catalog-fast',
        },
        {
          name: '.products-backup',
          nextRuleName: 'default_indices',
          nextProfileName: '_performant_indices',
        },
      ]}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onRetryLoad={onRetryLoad}
      {...props}
    />
  );
  return { onCancel, onConfirm, onRetryLoad };
};

const getRows = () =>
  screen.getAllByTestId('searchBoostDeleteRuleModalTableRow').map((row) =>
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
  );

describe('DeleteRuleModal', () => {
  it('lists what the rule applies to, sorted by name, with what each falls back to', () => {
    renderModal();

    expect(screen.getByText('Delete boost rule "product-catalog"?')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostDeleteRuleModalBody').textContent).toBe(
      "Deleting this rule will cause the 3 indices below to switch to the next matching rule and its boost profile, if there is one. The boost profile for this rule won't be deleted. You can't undo this action."
    );
    expect(
      within(screen.getByTestId('searchBoostDeleteRuleModalTable'))
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    ).toEqual(['Affected index', 'New rule', 'New profile']);
    expect(getRows()).toEqual([
      ['.products-backup', 'default_indices', '_performant_indices'],
      ['products', 'catalog', 'catalog-fast'],
      ['users', '—', '—'],
    ]);
  });

  it('says each target switches to the next rule when every one has one', () => {
    renderModal({
      fallbacks: [
        {
          name: 'products',
          nextRuleName: 'catalog',
          nextProfileName: 'catalog-fast',
        },
      ],
    });

    expect(screen.getByTestId('searchBoostDeleteRuleModalBody').textContent).toBe(
      "Deleting this rule will cause the 1 index below to switch to the next matching rule and its boost profile. The boost profile for this rule won't be deleted. You can't undo this action."
    );
  });

  it('describes the dialog with its text', () => {
    renderModal();

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      expect.stringContaining(
        screen.getByTestId('searchBoostDeleteRuleModalBody').textContent ?? ''
      )
    );
  });

  it('uses the data streams wording', () => {
    renderModal({ type: 'data_streams', fallbacks: [{ name: 'logs-oracle' }] });

    expect(screen.getByTestId('searchBoostDeleteRuleModalBody').textContent).toContain(
      'the 1 data stream below'
    );
    expect(screen.getByRole('columnheader', { name: 'Affected data stream' })).toBeInTheDocument();
  });

  it('says the rule is deleted without a table when it applies to nothing', () => {
    renderModal({ fallbacks: [] });

    expect(screen.getByTestId('searchBoostDeleteRuleModalBody').textContent).toBe(
      "This permanently deletes the rule. The boost profile for this rule won't be deleted. You can't undo this action."
    );
    expect(screen.queryByTestId('searchBoostDeleteRuleModalTable')).not.toBeInTheDocument();
  });

  it('calls back on cancel and confirm', async () => {
    const { onCancel, onConfirm } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete rule' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables confirming while what the rule applies to loads', () => {
    renderModal({ fallbacks: [], isLoading: true });

    expect(screen.queryByTestId('searchBoostDeleteRuleModalBody')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete rule' })).toBeDisabled();
  });

  it('shows a load error with a way to try again, and disables confirming', async () => {
    const { onRetryLoad } = renderModal({
      fallbacks: [],
      loadError: new Error('Request timed out'),
    });

    expect(screen.getByTestId('searchBoostModalLoadError').textContent).toContain(
      'Request timed out'
    );
    expect(screen.getByRole('button', { name: 'Delete rule' })).toBeDisabled();

    await userEvent.click(screen.getByTestId('searchBoostModalRetryLoad'));

    expect(onRetryLoad).toHaveBeenCalledTimes(1);
  });

  it('shows loading instead of the previous load error while trying again', () => {
    renderModal({ fallbacks: [], isLoading: true, loadError: new Error('Request timed out') });

    expect(screen.queryByTestId('searchBoostModalLoadError')).not.toBeInTheDocument();
    expect(screen.queryByTestId('searchBoostModalRetryLoad')).not.toBeInTheDocument();
    expect(screen.getByTestId('searchBoostModalLoading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete rule' })).toBeDisabled();
  });

  it('shows a spinner in the confirm button while deleting', () => {
    renderModal({ isDeleting: true });

    const confirmButton = screen.getByTestId('searchBoostModalConfirm');
    expect(within(confirmButton).getByRole('progressbar')).toBeInTheDocument();
  });

  it('closes with Escape or the close button', async () => {
    const { onCancel } = renderModal();

    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Closes this modal window' }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("can't be closed while deleting", async () => {
    const { onCancel } = renderModal({ isDeleting: true });

    expect(screen.getByTestId('searchBoostModalCancel')).toBeDisabled();
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Closes this modal window' }));

    expect(onCancel).not.toHaveBeenCalled();
  });
});
