/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';

import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import * as i18n from '../translations';
import { useAssistantContext } from '../../assistant_context';
import { ConnectorButton } from '../connector_button';
import { CONVERSATIONS_TAB } from '../../assistant/settings/const';

interface Props {
  isConnectorConfigured: boolean;
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isFlyoutMode: boolean;
}

/**
 * Error callout to be displayed when there is no connector configured for a conversation. Includes deep-link
 * to conversation settings to quickly resolve. Falls back to <ConnectorButton /> connector if privileges aren't met.
 *
 * TODO: Add 'quick fix' button to just pick a connector
 * TODO: Add setting for 'default connector' so we can auto-resolve and not even show this
 */
export const ConnectorMissingCallout: React.FC<Props> = React.memo(
  ({ isConnectorConfigured, isSettingsModalVisible, setIsSettingsModalVisible, isFlyoutMode }) => {
    const { assistantAvailability, setSelectedSettingsTab } = useAssistantContext();

    const onConversationSettingsClicked = useCallback(() => {
      if (!isSettingsModalVisible) {
        setIsSettingsModalVisible(true);
        setSelectedSettingsTab(CONVERSATIONS_TAB);
      }
    }, [isSettingsModalVisible, setIsSettingsModalVisible, setSelectedSettingsTab]);

    // Show missing callout if user has all privileges or read privileges and at least 1 connector configured
    const showMissingCallout =
      assistantAvailability.hasConnectorsAllPrivilege ||
      (assistantAvailability.hasConnectorsReadPrivilege && isConnectorConfigured);

    return (
      <>
        {showMissingCallout ? (
          <EuiCallOut
            data-test-subj="connectorMissingCallout"
            color="danger"
            iconType="controlsVertical"
            size="m"
            title={i18n.MISSING_CONNECTOR_CALLOUT_TITLE}
            css={
              isFlyoutMode &&
              css`
                padding-left: ${euiLightVars.euiPanelPaddingModifiers.paddingMedium} !important;
                padding-right: ${euiLightVars.euiPanelPaddingModifiers.paddingMedium} !important;
              `
            }
          >
            <p>
              <FormattedMessage
                defaultMessage="Select a connector above or from the {link} to continue"
                id="xpack.elasticAssistant.assistant.connectors.connectorMissingCallout.calloutDescription"
                values={{
                  link: (
                    <EuiLink onClick={onConversationSettingsClicked}>
                      {i18n.MISSING_CONNECTOR_CONVERSATION_SETTINGS_LINK}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiCallOut>
        ) : (
          <ConnectorButton />
        )}
      </>
    );
  }
);
ConnectorMissingCallout.displayName = 'ConnectorMissingCallout';
