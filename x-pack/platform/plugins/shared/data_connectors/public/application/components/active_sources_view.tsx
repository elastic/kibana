/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActiveSourcesTable } from './active_sources_table';
import { useActiveSources } from '../hooks/use_active_sources';
import type { ActiveSource } from '../../types/connector';

export const ActiveSourcesView: React.FC = () => {
  const { activeSources, isLoading } = useActiveSources();

  const handleReconnect = (source: ActiveSource) => {
    // TODO: Implement reconnect action when backend is ready
  };

  const handleEdit = (source: ActiveSource) => {
    // TODO: Implement edit action when backend is ready
  };

  const handleDelete = (source: ActiveSource) => {
    // TODO: Implement delete action when backend is ready
  };

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {activeSources.length === 0 ? (
        <EuiEmptyPrompt
          iconType="database"
          title={
            <h2>
              {i18n.translate('xpack.dataConnectors.activeSources.emptyTitle', {
                defaultMessage: 'No active sources',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.dataConnectors.activeSources.emptyDescription', {
                defaultMessage: 'Connect a data source to get started',
              })}
            </p>
          }
        />
      ) : (
        <ActiveSourcesTable
          sources={activeSources}
          isLoading={isLoading}
          onReconnect={handleReconnect}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </>
  );
};
