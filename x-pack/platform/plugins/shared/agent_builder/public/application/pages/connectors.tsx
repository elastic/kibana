/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPageTemplate, EuiBasicTable, EuiButton, EuiLink } from '@elastic/eui';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { AgentBuilderConnectorFeatureId } from '@kbn/actions-plugin/common';
import { useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { ConnectorItem } from '../../../common/http_api/tools';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useKibana } from '../hooks/use_kibana';
import { useFlyoutState } from '../hooks/use_flyout_state';
import { useListConnectors } from '../hooks/tools/use_mcp_connectors';
import { queryKeys } from '../query_keys';

// Convert ConnectorItem to the ActionConnector shape expected by the edit flyout
const toActionConnector = (c: ConnectorItem): ActionConnector =>
  ({
    id: c.id,
    name: c.name,
    actionTypeId: c.actionTypeId,
    isPreconfigured: c.isPreconfigured,
    isDeprecated: c.isDeprecated,
    isSystemAction: c.isSystemAction,
    isConnectorTypeDeprecated: c.isConnectorTypeDeprecated,
    config: c.config,
    isMissingSecrets: c.isMissingSecrets ?? false,
    secrets: {},
  } as ActionConnector);

export const AgentBuilderConnectorsPage: React.FC = () => {
  useBreadcrumb([
    {
      text: i18n.translate('xpack.agentBuilder.connectors.breadcrumb', {
        defaultMessage: 'Connectors',
      }),
      path: '/connectors',
    },
  ]);

  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const createFlyoutState = useFlyoutState();
  const [editingConnector, setEditingConnector] = useState<ActionConnector | null>(null);

  const { connectors, isLoading } = useListConnectors({});

  const handleConnectorCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.connectors.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.connectors.list() });
    createFlyoutState.closeFlyout();
  }, [queryClient, createFlyoutState]);

  const handleConnectorUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.connectors.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.connectors.list() });
    setEditingConnector(null);
  }, [queryClient]);

  const createFlyout = useMemo(
    () =>
      triggersActionsUi.getAddConnectorFlyout({
        onClose: createFlyoutState.closeFlyout,
        onConnectorCreated: handleConnectorCreated,
        featureId: AgentBuilderConnectorFeatureId,
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
        render: (name: string, connector: ConnectorItem) => (
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
          items={connectors as ConnectorItem[]}
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
