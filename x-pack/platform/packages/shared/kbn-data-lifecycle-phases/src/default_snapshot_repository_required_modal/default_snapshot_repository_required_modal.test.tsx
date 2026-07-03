/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { DefaultSnapshotRepositoryRequiredModal } from './default_snapshot_repository_required_modal';

describe('DefaultSnapshotRepositoryRequiredModal', () => {
  const createDefaultRepositoryUrl = '/app/management/data/snapshot_restore/add_repository';

  it('links to create a default snapshot repository in a new tab', () => {
    renderWithI18n(
      <DefaultSnapshotRepositoryRequiredModal
        createDefaultRepositoryUrl={createDefaultRepositoryUrl}
        onCancel={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(
      screen.getByTestId('defaultSnapshotRepositoryRequiredModalCreateDefaultRepositoryButton')
    ).toHaveAttribute('href', createDefaultRepositoryUrl);
    expect(
      screen.getByTestId('defaultSnapshotRepositoryRequiredModalCreateDefaultRepositoryButton')
    ).toHaveAttribute('target', '_blank');
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();

    renderWithI18n(
      <DefaultSnapshotRepositoryRequiredModal
        createDefaultRepositoryUrl={createDefaultRepositoryUrl}
        onCancel={onCancel}
        onRefresh={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('defaultSnapshotRepositoryRequiredModalCancelButton'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onRefresh when refresh is clicked', () => {
    const onRefresh = jest.fn();

    renderWithI18n(
      <DefaultSnapshotRepositoryRequiredModal
        createDefaultRepositoryUrl={createDefaultRepositoryUrl}
        onCancel={() => {}}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByTestId('defaultSnapshotRepositoryRequiredModalRefreshButton'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('disables refresh while refreshing', () => {
    const onRefresh = jest.fn();

    renderWithI18n(
      <DefaultSnapshotRepositoryRequiredModal
        createDefaultRepositoryUrl={createDefaultRepositoryUrl}
        onCancel={() => {}}
        onRefresh={onRefresh}
        isRefreshing={true}
      />
    );

    const refreshButton = screen.getByTestId('defaultSnapshotRepositoryRequiredModalRefreshButton');

    expect(refreshButton).toBeDisabled();

    fireEvent.click(refreshButton);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
