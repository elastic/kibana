/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SaveAsNewProps, UpdateProfileModalProps } from './update_profile_modal';
import { UpdateProfileModal } from './update_profile_modal';

const renderModal = (
  props: Partial<UpdateProfileModalProps> = {},
  saveAsNewProps: Partial<SaveAsNewProps> = {}
) => {
  const onCancel = jest.fn();
  const onSave = jest.fn();
  const onSaveAsNew = jest.fn();
  const getModal = (overrides: Partial<UpdateProfileModalProps> = {}) => (
    <UpdateProfileModal
      profileName="catalog-fast"
      type="indices"
      targets={[
        { name: 'products', ruleName: 'product-catalog' },
        { name: '.products-backup', ruleName: 'product-catalog' },
      ]}
      onCancel={onCancel}
      onSave={onSave}
      saveAsNew={{ suggestedName: 'catalog-fast-copy', onSave: onSaveAsNew, ...saveAsNewProps }}
      {...props}
      {...overrides}
    />
  );
  const { rerender } = render(getModal());
  return {
    onCancel,
    onSave,
    onSaveAsNew,
    rerender: (overrides: Partial<UpdateProfileModalProps>) => rerender(getModal(overrides)),
  };
};

const getBody = () => screen.getByTestId('searchBoostUpdateProfileModalBody').textContent;

const getNameField = () => screen.getByTestId('searchBoostSaveAsNewName');

const openSaveAsNew = () => userEvent.click(screen.getByRole('button', { name: 'Save as new' }));

describe('UpdateProfileModal', () => {
  it('lists what the profile applies to, sorted by name, with the rule that applies it', () => {
    renderModal();

    expect(screen.getByText('Update boost profile "catalog-fast"?')).toBeInTheDocument();
    expect(getBody()).toBe(
      'Saving these profile changes will affect the 2 indices that currently use it. Alternatively, you may save it as a new boost profile to avoid affecting these indices.'
    );
    const table = screen.getByTestId('searchBoostUpdateProfileModalTable');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    ).toEqual(['Affected index', 'Boost rule']);
    expect(
      screen.getAllByTestId('searchBoostUpdateProfileModalTableRow').map((row) => row.textContent)
    ).toEqual(['.products-backupproduct-catalog', 'productsproduct-catalog']);
  });

  it('uses the singular data streams wording', () => {
    renderModal({
      type: 'data_streams',
      targets: [{ name: 'logs-oracle-default', ruleName: 'logs-oracle' }],
    });

    expect(getBody()).toBe(
      'Saving these profile changes will affect the 1 data stream that currently uses it. Alternatively, you may save it as a new boost profile to avoid affecting this data stream.'
    );
    expect(screen.getByRole('columnheader', { name: 'Affected data stream' })).toBeInTheDocument();
  });

  it('calls back on cancel and save', async () => {
    const { onCancel, onSave } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('says nothing is affected, without a table, when no rule uses the profile', () => {
    renderModal({ targets: [] });

    expect(screen.getByTestId('searchBoostUpdateProfileModalBody').textContent).toBe(
      "Saving these profile changes won't affect any indices, since no boost rule applies this profile to one."
    );
    expect(screen.queryByTestId('searchBoostUpdateProfileModalTable')).not.toBeInTheDocument();
  });

  it('only offers saving over the profile when saving as new is left out', () => {
    renderModal({ saveAsNew: undefined });

    expect(getBody()).toBe(
      'Saving these profile changes will affect the 2 indices that currently use it.'
    );
    expect(screen.queryByRole('button', { name: 'Save as new' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it.each([
    ['indices', 1, 'Saving these profile changes will affect the 1 index that currently uses it.'],
    [
      'data_streams',
      1,
      'Saving these profile changes will affect the 1 data stream that currently uses it.',
    ],
    [
      'data_streams',
      2,
      'Saving these profile changes will affect the 2 data streams that currently use it.',
    ],
  ] as const)('words the body for %s, %i affected, without saving as new', (type, count, body) => {
    renderModal({
      type,
      targets: Array.from({ length: count }, (_, index) => ({
        name: `target-${index}`,
        ruleName: 'rule',
      })),
      saveAsNew: undefined,
    });

    expect(getBody()).toBe(body);
  });

  it('disables "Save as new" while saving', () => {
    renderModal({ isSaving: true });

    expect(screen.getByRole('button', { name: 'Save as new' })).toBeDisabled();
  });

  it('disables both saves while what the profile applies to loads', () => {
    renderModal({ targets: [], isLoading: true });

    expect(screen.getByTestId('searchBoostModalConfirm')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as new' })).toBeDisabled();
  });

  describe('save as new step', () => {
    it('opens in the same modal, with the suggested name focused', async () => {
      renderModal();

      await openSaveAsNew();

      expect(screen.getByText('Save as new boost profile')).toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostUpdateProfileModalTable')).not.toBeInTheDocument();
      expect(getNameField()).toHaveValue('catalog-fast-copy');
      expect(getNameField()).toHaveFocus();
      expect(
        screen.getByText('Only lowercase letters, numbers, hyphens, and underscores allowed.')
      ).toBeInTheDocument();
    });

    it('saves with the name', async () => {
      const { onSaveAsNew, onSave } = renderModal();

      await openSaveAsNew();
      await userEvent.clear(getNameField());
      await userEvent.type(getNameField(), 'catalog-faster');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(onSaveAsNew).toHaveBeenCalledWith('catalog-faster');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('saves when pressing Enter in the field', async () => {
      const { onSaveAsNew } = renderModal();

      await openSaveAsNew();
      await userEvent.type(getNameField(), '{enter}');

      expect(onSaveAsNew).toHaveBeenCalledWith('catalog-fast-copy');
    });

    it('shows format errors once saving, without calling back', async () => {
      const { onSaveAsNew } = renderModal();

      await openSaveAsNew();
      await userEvent.clear(getNameField());
      await userEvent.type(getNameField(), 'Catalog Copy');

      expect(screen.queryByText(/Use lowercase letters/)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(
        screen.getByText(
          'Use lowercase letters, numbers, hyphens, and underscores, starting with a letter or number.'
        )
      ).toBeInTheDocument();
      expect(onSaveAsNew).not.toHaveBeenCalled();

      await userEvent.clear(getNameField());

      expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    });

    it('follows a new suggested name until the name is edited', async () => {
      const { rerender } = renderModal();

      await openSaveAsNew();
      rerender({ saveAsNew: { suggestedName: 'catalog-fast-copy-2', onSave: jest.fn() } });

      expect(getNameField()).toHaveValue('catalog-fast-copy-2');
    });

    it('shows the error passed in only for its name', async () => {
      const { rerender } = renderModal();
      const message = 'A boost profile with this name already exists.';

      await openSaveAsNew();
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      rerender({
        saveAsNew: {
          suggestedName: 'catalog-fast-copy',
          nameError: { name: 'catalog-fast-copy', message },
          onSave: jest.fn(),
        },
      });

      expect(screen.getByText(message)).toBeInTheDocument();

      await userEvent.type(getNameField(), '-2');

      expect(screen.queryByText(message)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.queryByText(message)).not.toBeInTheDocument();
    });

    it('goes back to the first step, keeping the name', async () => {
      renderModal();

      await openSaveAsNew();
      await userEvent.type(getNameField(), '-2');
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByTestId('searchBoostUpdateProfileModalTable')).toBeInTheDocument();

      await openSaveAsNew();

      expect(getNameField()).toHaveValue('catalog-fast-copy-2');
    });

    it('closes the modal with Escape', async () => {
      const { onCancel } = renderModal();

      await openSaveAsNew();
      await userEvent.keyboard('{Escape}');

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("disables the step and can't be closed while saving", async () => {
      const { onCancel, rerender } = renderModal();

      await openSaveAsNew();
      rerender({ isSaving: true });

      expect(getNameField()).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
      const saveButton = screen.getByTestId('searchBoostModalConfirm');
      expect(within(saveButton).getByRole('progressbar')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByText('Save as new boost profile')).toBeInTheDocument();
    });
  });
});
