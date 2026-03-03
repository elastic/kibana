/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPageTemplate, EuiBasicTable, EuiButton, EuiLink } from '@elastic/eui';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useKibana } from '../hooks/use_kibana';
import { useFlyoutState } from '../hooks/use_flyout_state';

// The REST API returns snake_case fields
interface ConnectorApiResponse {
  id: string;
  name: string;
  connector_type_id: string;
  is_preconfigured: boolean;
  is_deprecated: boolean;
  is_system_action: boolean;
  is_connector_type_deprecated: boolean;
  config: Record<string, unknown>;
  referenced_by_count: number;
}

// Convert API response to the camelCase shape expected by the edit flyout
const toActionConnector = (c: ConnectorApiResponse): ActionConnector =>
  ({
    id: c.id,
    name: c.name,
    actionTypeId: c.connector_type_id,
    isPreconfigured: c.is_preconfigured,
    isDeprecated: c.is_deprecated,
    isSystemAction: c.is_system_action,
    isConnectorTypeDeprecated: c.is_connector_type_deprecated,
    config: c.config,
    isMissingSecrets: false,
    secrets: {},
  } as ActionConnector);

export const AgentBuilderConnectorsPage: React.FC = () => {
  useBreadcrumb([{ text: 'Connectors', path: '/connectors' }]);

  const {
    services: {
      http,
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const createFlyoutState = useFlyoutState();
  const [editingConnector, setEditingConnector] = useState<ActionConnector | null>(null);

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ['agentBuilder', 'connectors'],
    queryFn: async () => {
      return http.get<ConnectorApiResponse[]>('/api/actions/connectors');
    },
  });

  const handleConnectorCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['agentBuilder', 'connectors'] });
    createFlyoutState.closeFlyout();
  }, [queryClient, createFlyoutState]);

  const handleConnectorUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['agentBuilder', 'connectors'] });
    setEditingConnector(null);
  }, [queryClient]);

  const createFlyout = useMemo(
    () =>
      triggersActionsUi.getAddConnectorFlyout({
        onClose: createFlyoutState.closeFlyout,
        onConnectorCreated: handleConnectorCreated,
      }),
    [createFlyoutState.closeFlyout, handleConnectorCreated, triggersActionsUi]
  );

  const handleEditClose = useCallback(() => setEditingConnector(null), []);

  const editFlyout = useMemo(() => {
    if (!editingConnector) return null;
    return triggersActionsUi.getEditConnectorFlyout({
      connector: editingConnector,
      onClose: handleEditClose,
      onConnectorUpdated: handleConnectorUpdated,
    });
  }, [editingConnector, handleEditClose, handleConnectorUpdated, triggersActionsUi]);

  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.agentBuilder.connectors.column.name', {
          defaultMessage: 'Name',
        }),
        render: (name: string, connector: ConnectorApiResponse) => (
          <EuiLink onClick={() => setEditingConnector(toActionConnector(connector))}>
            {name}
          </EuiLink>
        ),
      },
    ],
    []
  );

  return (
    <EuiPageTemplate offset={0} restrictWidth={false}>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.agentBuilder.connectors.pageTitle', {
          defaultMessage: 'Connectors',
        })}
        description={i18n.translate('xpack.agentBuilder.connectors.pageDescription', {
          defaultMessage:
            'Manage connectors for your agents. Connectors with workflow definitions will automatically create tools when configured.',
        })}
        rightSideItems={[
          <EuiButton key="create" fill iconType="plus" onClick={createFlyoutState.openFlyout}>
            {i18n.translate('xpack.agentBuilder.connectors.createButton', {
              defaultMessage: 'Create connector',
            })}
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        <EuiBasicTable
          items={connectors}
          columns={columns}
          loading={isLoading}
          tableCaption={i18n.translate('xpack.agentBuilder.connectors.tableCaption', {
            defaultMessage: 'Connectors',
          })}
        />
      </EuiPageTemplate.Section>
      {createFlyoutState.isOpen && createFlyout}
      {editFlyout}
    </EuiPageTemplate>
  );
};
