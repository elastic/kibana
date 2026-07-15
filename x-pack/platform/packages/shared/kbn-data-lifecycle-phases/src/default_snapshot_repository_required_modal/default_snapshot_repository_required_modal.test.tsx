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
  const manageRepositoriesUrl = '/app/management/data/snapshot_restore/repositories';

  it('links to create a default snapshot repository in a new tab when there are no existing repositories', () => {
    renderWithI18n(
      <DefaultSnapshotRepositoryRequiredModal
        createDefaultRepositoryUrl={createDefaultRepositoryUrl}
        manageRepositoriesUrl={manageRepositoriesUrl}
        hasExistingRepositories={false}
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
    expect(
      screen.queryByTestId('defaultSnapshotRepositoryRequiredModalManageRepositoriesButton')
    ).not.toBeInTheDocument();
  });

  it('links to the repositories list when the user already has repositories', () => {
    renderWithI18n(
      <DefaultSnapshotRepositoryRequiredModal
        createDefaultRepositoryUrl={createDefaultRepositoryUrl}
        manageRepositoriesUrl={manageRepositoriesUrl}
        hasExistingRepositories={true}
        onCancel={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(
      screen.getByTestId('defaultSnapshotRepositoryRequiredModalManageRepositoriesButton')
    ).toHaveAttribute('href', manageRepositoriesUrl);
    expect(
      screen.getByTestId('defaultSnapshotRepositoryRequiredModalManageRepositoriesButton')
    ).toHaveAttribute('target', '_blank');
    expect(
      screen.queryByTestId('defaultSnapshotRepositoryRequiredModalCreateDefaultRepositoryButton')
    ).not.toBeInTheDocument();
  });

  it('links to create a default repository when there are existing repositories but no manage URL', () => {
    renderWithI18n(
      <DefaultSnapshotRepositoryRequiredModal
        createDefaultRepositoryUrl={createDefaultRepositoryUrl}
        hasExistingRepositories={true}
        onCancel={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(
      screen.getByTestId('defaultSnapshotRepositoryRequiredModalCreateDefaultRepositoryButton')
    ).toHaveAttribute('href', createDefaultRepositoryUrl);
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
