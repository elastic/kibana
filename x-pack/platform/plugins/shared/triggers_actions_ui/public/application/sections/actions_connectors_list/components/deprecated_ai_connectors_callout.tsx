/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  handleCalloutClick: () => void;
}

export const DeprecatedAIConnectorsCallOut: React.FC<Props> = ({ handleCalloutClick }) => (
  <EuiCallOut
    title={
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.connector.home.deprecatedAiConnectorsBannerTitle"
        defaultMessage="OpenAI, Amazon Bedrock, and Google Gemini will soon be replaced and existing connectors will be deprecated."
      />
    }
    data-test-subj="connector-deprecated-callout"
    color="warning"
  >
    <FormattedMessage
      id="xpack.triggersActionsUI.components.actionConnectorAdd.deprecatedAiConnectorsBannerMessage"
      defaultMessage="Only connectors created with the {aiConnectorLink} for these services will remain. While you can still access existing connectors and create new ones with this flow, make sure to migrate in a timely manner to avoid interruptions in your workflow."
      values={{
        aiConnectorLink: (
          <EuiLink onClick={handleCalloutClick}>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.connector.home.deprecatedAiConnectorsBannerTitleLink"
              defaultMessage="new AI Connector flow"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiCallOut>
);
