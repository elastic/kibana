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
import { ConnectorSelector, type AIConnector } from '../connector_selector';
import * as i18n from './translations';

interface Params {
  isDisabled?: boolean;
  selectedConnectorId?: string;
  onConnectorSelectionChange?: (connector: AIConnector) => void;
}

export const SettingsContextMenu: React.FC<Params> = React.memo(
  ({ isDisabled = false, onConnectorSelectionChange, selectedConnectorId }: Params) => {
    const {
      services: { application },
    } = useKibana();

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
        <EuiContextMenuItem
          aria-label={'connector-selector'}
          key={'connector-selector'}
          icon={'link'}
          data-test-subj={'connector-selector'}
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <ConnectorSelector
                selectedConnectorId={selectedConnectorId}
                onConnectorSelectionChange={onConnectorSelectionChange}
                isDisabled={isDisabled}
                fullWidth={true}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiContextMenuItem>,
      ],
      [handleNavigateToSettings, selectedConnectorId, isDisabled, onConnectorSelectionChange]
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
