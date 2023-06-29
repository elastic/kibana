/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { Conversation } from '../..';
import * as i18n from './translations';
import { ConnectorSelector } from '../connectorland/connector_selector';

export interface SettingsPopoverProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  conversation: Conversation;
  http: HttpSetup;
  isDisabled?: boolean;
}

export const SettingsPopover: React.FC<SettingsPopoverProps> = React.memo(
  ({ actionTypeRegistry, conversation, http, isDisabled = false }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // So we can hide the settings popover when the connector modal is displayed
    const popoverPanelRef = useRef<HTMLElement | null>(null);

    const closeSettingsHandler = useCallback(() => {
      setIsSettingsOpen(false);
    }, []);

    // Hide settings panel when modal is visible (to keep visual clutter minimal)
    const onConnectorModalVisibilityChange = useCallback((isVisible: boolean) => {
      if (popoverPanelRef.current) {
        popoverPanelRef.current.style.visibility = isVisible ? 'hidden' : 'visible';
      }
    }, []);

    return (
      <EuiPopover
        button={
          <EuiToolTip position="right" content={i18n.SETTINGS_TITLE}>
            <EuiButtonIcon
              disabled={isDisabled}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              iconType="controlsVertical"
              aria-label={i18n.SETTINGS_TITLE}
              data-test-subj="assistant-settings-button"
            />
          </EuiToolTip>
        }
        isOpen={isSettingsOpen}
        closePopover={closeSettingsHandler}
        anchorPosition="rightCenter"
        panelRef={(el) => (popoverPanelRef.current = el)}
      >
        <EuiPopoverTitle>{i18n.SETTINGS_TITLE}</EuiPopoverTitle>
        <div style={{ width: '300px' }}>
          <EuiFormRow
            data-test-subj="model-field"
            label={i18n.SETTINGS_CONNECTOR_TITLE}
            helpText={
              <EuiLink
                href={`${http.basePath.get()}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`}
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.elasticAssistant.assistant.settings.connectorHelpTextTitle"
                  defaultMessage="Kibana Connector to make requests with"
                />
              </EuiLink>
            }
          >
            <ConnectorSelector
              actionTypeRegistry={actionTypeRegistry}
              conversation={conversation}
              http={http}
              onConnectorModalVisibilityChange={onConnectorModalVisibilityChange}
            />
          </EuiFormRow>
        </div>
      </EuiPopover>
    );
  }
);
SettingsPopover.displayName = 'SettingPopover';
