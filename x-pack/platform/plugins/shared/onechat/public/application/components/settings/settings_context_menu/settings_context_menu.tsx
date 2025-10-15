/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { ConnectorSelector } from '../connector_selector';
import * as i18n from './translations';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import { useConnectorId } from '../../../hooks/use_conversation';
import { useConversationActions } from '../../../hooks/use_conversation_actions';
import type { ConversationSettings } from '../../../../services/types';

interface Params {
  isDisabled?: boolean;
}

export const SettingsContextMenu: React.FC<Params> = React.memo(
  ({ isDisabled = false }: Params) => {
    const { conversationSettingsService } = useOnechatServices();
    const connectorId = useConnectorId();
    const {
      services: { application },
    } = useKibana();

    const { setConnector } = useConversationActions();

    // Subscribe to conversation settings to get the settingsMenuComponent
    const conversationSettings = useObservable<ConversationSettings>(
      conversationSettingsService.getConversationSettings$(),
      {}
    );

    const [isPopoverOpen, setPopover] = useState(false);

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setPopover(false);
    }, []);

    const handleNavigateToSettings = useCallback(() => {
      // Navigate to onechat settings - adjust path as needed
      application?.navigateToApp('management', {
        path: 'ai/securityAiAssistantManagement',
      });
      closePopover();
    }, [application, closePopover]);

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          aria-label={'onechat-settings'}
          key={'onechat-settings'}
          onClick={handleNavigateToSettings}
          icon={'gear'}
          data-test-subj={'onechat-settings'}
        >
          {i18n.ONECHAT_SETTINGS}
        </EuiContextMenuItem>,
        ...(conversationSettings?.customMenuItems || []),
        <EuiContextMenuItem
          aria-label={'connector-selector'}
          key={'connector-selector'}
          icon={'link'}
          data-test-subj={'connector-selector'}
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <ConnectorSelector
                selectedConnectorId={connectorId}
                onConnectorSelectionChange={(connector) => {
                  setConnector(connector.id);
                  conversationSettings.onConnectorSelectionChange?.(connector);
                }}
                isDisabled={isDisabled}
                fullWidth={true}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiContextMenuItem>,
      ],
      [handleNavigateToSettings, connectorId, isDisabled, conversationSettings, setConnector]
    );

    return (
      <EuiToolTip content={i18n.ONECHAT_MENU}>
        <EuiPopover
          button={
            <EuiButtonIcon
              aria-label={i18n.ONECHAT_MENU}
              isDisabled={isDisabled}
              iconType="controls"
              onClick={onButtonClick}
              data-test-subj="onechat-context-menu"
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="leftUp"
        >
          <EuiContextMenuPanel
            items={items}
            css={css`
              width: 280px;
            `}
          />
        </EuiPopover>
      </EuiToolTip>
    );
  }
);

SettingsContextMenu.displayName = 'SettingsContextMenu';
