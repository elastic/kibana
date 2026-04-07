/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useConnectorOAuthConnect, OAuthRedirectMode } from '@kbn/response-ops-oauth-hooks';
import React, { useMemo } from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { OAUTH_STATUS } from '../../../../../common/http_api/tools';
import { useConnectorsActions } from '../../../context/connectors_provider';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';
import { ConnectorTypeIcon } from '../connector_type_icon';
import { ConnectorContextMenu } from './connectors_table_context_menu';
import { ConnectorQuickActions } from './connectors_table_quick_actions';

/**
 * Clickable badge for not-authorized OAuth connectors.
 */
const NotAuthorizedBadge: React.FC<{ connector: ConnectorItem }> = ({ connector }) => {
  const {
    services: {
      notifications: { toasts },
    },
  } = useKibana();
  const { invalidateConnectors } = useConnectorsActions();

  const { connect } = useConnectorOAuthConnect({
    connectorId: connector.id,
    redirectMode: OAuthRedirectMode.NewTab,
    onSuccess: () => {
      toasts.addSuccess({
        title: labels.connectors.oauthConnectSuccessTitle,
        text: labels.connectors.oauthConnectSuccessMessage,
      });
      invalidateConnectors();
    },
    onError: (error) => {
      toasts.addDanger({
        title: labels.connectors.oauthConnectErrorTitle,
        text: error.message,
      });
    },
  });

  return (
    <EuiToolTip content={labels.connectors.statusNotAuthorizedTooltip}>
      <EuiBadge
        color="default"
        onClick={() => connect()}
        onClickAriaLabel={labels.connectors.statusNotAuthorizedTooltip}
        data-test-subj={`agentBuilderConnectorsNotAuthorizedBadge-${connector.id}`}
        css={({ euiTheme }) => ({
          padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
          cursor: 'pointer',
        })}
      >
        {labels.connectors.statusNotAuthorized} <EuiIcon type="link" size="s" aria-hidden={true} />
      </EuiBadge>
    </EuiToolTip>
  );
};

export const useConnectorsTableColumns = (): Array<EuiBasicTableColumn<ConnectorItem>> => {
  const { editConnector } = useConnectorsActions();
  const {
    services: {
      application,
      plugins: { triggersActionsUi },
    },
  } = useKibana();
  const canDelete = application.capabilities.actions?.delete === true;
  const { actionTypeRegistry } = triggersActionsUi;

  return useMemo(
    () => [
      {
        field: 'name',
        name: labels.connectors.nameColumn,
        width: '45%',
        render: (name: string, connector: ConnectorItem) => (
          <EuiLink
            data-test-subj={`agentBuilderConnectorsTableNameLink-${connector.id}`}
            onClick={() => editConnector(connector)}
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'actionTypeId',
        name: labels.connectors.typeColumn,
        width: '25%',
        render: (actionTypeId: string) => {
          const typeName = actionTypeRegistry.has(actionTypeId)
            ? actionTypeRegistry.get(actionTypeId).actionTypeTitle ?? actionTypeId
            : actionTypeId;

          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <ConnectorTypeIcon actionTypeId={actionTypeId} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{typeName}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'oauthStatus',
        name: labels.connectors.statusColumn,
        width: '25%',
        render: (oauthStatus: ConnectorItem['oauthStatus'], connector: ConnectorItem) => {
          if (!oauthStatus) return <EuiText size="s">-</EuiText>;
          if (oauthStatus === OAUTH_STATUS.AUTHORIZED) {
            return (
              <EuiBadge
                color="success"
                css={({ euiTheme }) => ({ padding: `${euiTheme.size.xs} ${euiTheme.size.s}` })}
              >
                {labels.connectors.statusAuthorized}
              </EuiBadge>
            );
          }
          return <NotAuthorizedBadge connector={connector} />;
        },
      },
      {
        width: '100px',
        align: 'right',
        render: (connector: ConnectorItem) => (
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
            {canDelete && <ConnectorQuickActions connector={connector} />}
            <ConnectorContextMenu connector={connector} />
          </EuiFlexGroup>
        ),
      },
    ],
    [editConnector, actionTypeRegistry, canDelete]
  );
};
