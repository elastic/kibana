/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../translations';
import { useAssistantContext } from '../../assistant_context';
import { CONVERSATIONS_TAB } from '../../assistant/settings/assistant_settings';

interface Props {
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Error callout to be displayed when there is no connector configured for a conversation. Includes deep-link
 * to conversation settings to quickly resolve.
 *
 * TODO: Add 'quick fix' button to just pick a connector
 * TODO: Add setting for 'default connector' so we can auto-resolve and not even show this
 */
export const ConnectorMissingCallout: React.FC<Props> = React.memo(
  ({ isSettingsModalVisible, setIsSettingsModalVisible }) => {
    const { setSelectedSettingsTab } = useAssistantContext();

    const onConversationSettingsClicked = useCallback(() => {
      if (!isSettingsModalVisible) {
        setIsSettingsModalVisible(true);
        setSelectedSettingsTab(CONVERSATIONS_TAB);
      }
    }, [isSettingsModalVisible, setIsSettingsModalVisible, setSelectedSettingsTab]);

    return (
      <EuiCallOut
        color="danger"
        iconType="controlsVertical"
        size="m"
        title={i18n.MISSING_CONNECTOR_CALLOUT_TITLE}
      >
        <p>
          {' '}
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
    );
  }
);
ConnectorMissingCallout.displayName = 'ConnectorMissingCallout';
