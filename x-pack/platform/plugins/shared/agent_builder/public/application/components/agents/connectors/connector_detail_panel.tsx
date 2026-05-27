/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';
import { DetailPanelLayout } from '../common/detail_panel_layout';
import { ConnectorTypeIcon } from '../../connectors/connector_type_icon';

interface ConnectorDetailPanelProps {
  connector: ConnectorItem;
  onRemove: (connector: ConnectorItem) => void;
  canEditAgent: boolean;
}

export const ConnectorDetailPanel: React.FC<ConnectorDetailPanelProps> = ({
  connector,
  onRemove,
  canEditAgent,
}) => {
  const { euiTheme } = useEuiTheme();
  const { actionTypeRegistry } = useKibana().services.plugins.triggersActionsUi;

  const actionType = actionTypeRegistry.has(connector.actionTypeId)
    ? actionTypeRegistry.get(connector.actionTypeId)
    : null;

  const typeName = actionType?.actionTypeTitle ?? connector.actionTypeId;
  const description = actionType?.selectMessage ?? null;

  return (
    <DetailPanelLayout
      isLoading={false}
      isEmpty={false}
      title={connector.name}
      headerContent={
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          <EuiFlexItem grow={false}>
            <ConnectorTypeIcon actionTypeId={connector.actionTypeId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {typeName}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      headerActions={(openConfirmRemove) =>
        canEditAgent ? (
          <EuiButtonEmpty iconType="cross" size="xs" color="danger" onClick={openConfirmRemove}>
            {labels.agentConnectors.removeConnectorButtonLabel}
          </EuiButtonEmpty>
        ) : null
      }
      confirmRemove={{
        title: labels.agentConnectors.removeConnectorConfirmTitle(connector.name),
        body: labels.agentConnectors.removeConnectorConfirmBody,
        confirmButtonText: labels.agentConnectors.removeConnectorConfirmButton,
        cancelButtonText: labels.agentConnectors.removeConnectorCancelButton,
        onConfirm: () => onRemove(connector),
      }}
    >
      {description && <EuiText size="s">{description}</EuiText>}
    </DetailPanelLayout>
  );
};
