/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';

export interface ConnectorSettingsFlyoutProps {
  sourceId: string;
  sources: DataSourceListItem[];
  onClose: () => void;
}

/** Maps a sample data source row to a user connector usable by {@link EditConnectorFlyout}. */
export function dataSourceToMockWebhookConnector(source: DataSourceListItem): ActionConnector {
  return {
    id: source.id,
    name: source.name,
    actionTypeId: '.webhook',
    config: {
      url: `https://example.invalid/mock/${encodeURIComponent(source.id)}`,
      method: 'post',
      hasAuth: false,
      authType: null,
      headers: null,
    },
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
  };
}

/**
 * Opens the shared Stack Management edit-connector flyout, populated from the selected
 * sample data source (prototype).
 */
export const ConnectorSettingsFlyout: FunctionComponent<ConnectorSettingsFlyoutProps> = ({
  sourceId,
  sources,
  onClose,
}) => {
  const { triggersActionsUi } = useDataSourceManagementAppContext();

  const source = useMemo(
    () => sources.find((row) => row.id === sourceId) ?? null,
    [sourceId, sources]
  );

  const flyout = useMemo(() => {
    if (!source) {
      return null;
    }
    return triggersActionsUi.getEditConnectorFlyout({
      connector: dataSourceToMockWebhookConnector(source),
      onClose,
      hideRulesTab: true,
    });
  }, [onClose, source, triggersActionsUi]);

  return <>{flyout}</>;
};
