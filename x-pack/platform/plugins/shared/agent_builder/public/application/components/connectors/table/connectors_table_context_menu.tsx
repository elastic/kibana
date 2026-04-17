/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useConnectorOAuthDisconnect } from '@kbn/response-ops-oauth-hooks';
import React, { useState } from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { OAUTH_STATUS } from '../../../../../common/http_api/tools';
import { useConnectorsActions } from '../../../context/connectors_provider';
import { useKibana } from '../../../hooks/use_kibana';
import { labels } from '../../../utils/i18n';

export interface ConnectorContextMenuProps {
  connector: ConnectorItem;
}

/**
 * Disconnect confirmation modal for OAuth connectors.
 */
const DisconnectConfirmModal: React.FC<{
  connector: ConnectorItem;
  onCancel: () => void;
}> = ({ connector, onCancel }) => {
  const {
    services: {
      notifications: { toasts },
    },
  } = useKibana();
  const { invalidateConnectors } = useConnectorsActions();
  const disconnectModalTitleId = useGeneratedHtmlId({ prefix: 'disconnectConnectorTitle' });

  const { disconnect, isDisconnecting } = useConnectorOAuthDisconnect({
    connectorId: connector.id,
    onSuccess: () => {
      toasts.addSuccess({
        title: labels.connectors.oauthDisconnectSuccessTitle,
        text: labels.connectors.oauthDisconnectSuccessMessage,
      });
      invalidateConnectors();
      onCancel();
    },
    onError: (error) => {
      toasts.addDanger({
        title: labels.connectors.oauthDisconnectErrorTitle,
        text: error.message,
      });
      onCancel();
    },
  });

  return (
    <EuiConfirmModal
      aria-labelledby={disconnectModalTitleId}
      titleProps={{ id: disconnectModalTitleId }}
      title={labels.connectors.disconnectConfirmTitle(connector.name)}
      onCancel={onCancel}
      onConfirm={disconnect}
      cancelButtonText={labels.connectors.disconnectCancelButton}
      confirmButtonText={labels.connectors.disconnectConfirmButton}
      buttonColor="danger"
      isLoading={isDisconnecting}
    >
      {labels.connectors.disconnectConfirmMessage}
    </EuiConfirmModal>
  );
};

export const ConnectorContextMenu = ({ connector }: ConnectorContextMenuProps) => {
  const { editConnector, deleteConnector } = useConnectorsActions();
  const [isOpen, setIsOpen] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const {
    services: { application },
  } = useKibana();
  const canDelete = application.capabilities.actions?.delete === true;
  const isAuthorized = connector.oauthStatus === OAUTH_STATUS.AUTHORIZED;
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <EuiPopover
        id={`${connector.id}_context-menu`}
        aria-label={labels.connectors.connectorContextMenuButtonLabel}
        panelPaddingSize="s"
        button={
          <EuiButtonIcon
            iconType="boxesVertical"
            onClick={() => setIsOpen((openState) => !openState)}
            aria-label={labels.connectors.connectorContextMenuButtonLabel}
          />
        }
        isOpen={isOpen}
        closePopover={closeMenu}
      >
        <EuiContextMenuPanel size="s">
          <EuiContextMenuItem
            icon="pencil"
            key="edit"
            size="s"
            onClick={() => {
              editConnector(connector);
              closeMenu();
            }}
          >
            {labels.connectors.editConnectorButtonLabel}
          </EuiContextMenuItem>
          {isAuthorized && (
            <EuiContextMenuItem
              icon="linkSlash"
              key="disconnect"
              size="s"
              onClick={() => {
                setShowDisconnectConfirm(true);
                closeMenu();
              }}
            >
              {labels.connectors.disconnectButtonLabel}
            </EuiContextMenuItem>
          )}
          {canDelete && (
            <EuiContextMenuItem
              icon="trash"
              key="delete"
              size="s"
              css={({ euiTheme }) => ({
                color: euiTheme.colors.textDanger,
              })}
              onClick={() => {
                deleteConnector(connector);
                closeMenu();
              }}
            >
              {labels.connectors.deleteConnectorButtonLabel}
            </EuiContextMenuItem>
          )}
        </EuiContextMenuPanel>
      </EuiPopover>
      {showDisconnectConfirm && (
        <DisconnectConfirmModal
          connector={connector}
          onCancel={() => setShowDisconnectConfirm(false)}
        />
      )}
    </>
  );
};
