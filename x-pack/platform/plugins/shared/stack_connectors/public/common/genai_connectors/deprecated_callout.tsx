/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { EuiCallOut, EuiIcon, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionType } from '@kbn/actions-plugin/common/types';

interface Props {
  id: string;
  name: string;
  provider: string;
  allActionTypes: Record<string, ActionType> | undefined;
  handleActionTypeChange: (actionTypes: ActionType) => void;
}

const DeprecatedAIConnectorCallOut: React.FC<Props> = ({
  id,
  name,
  allActionTypes,
  handleActionTypeChange,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const redirectToInferenceConnector = () => {
    if (allActionTypes && allActionTypes['.inference']) {
      handleActionTypeChange(allActionTypes['.inference']);

      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('selectedConnector', '.inference');
      newSearchParams.set('connectorState', JSON.stringify({ provider: id }));
      // Update the URL without a full page refresh
      setSearchParams(newSearchParams);
    }
  };
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.stackConnectors.components.actionConnectorAdd.deprecatedBannerTitle"
          defaultMessage="{icon} {connectorName} connector flow will soon be replaced and existing connectors will be deprecated."
          values={{
            icon: <EuiIcon type="info" size="s" />,
            connectorName: name,
          }}
        />
      }
      data-test-subj="connector-deprecated-callout"
      color="warning"
    >
      <FormattedMessage
        id="xpack.stackConnectors.components.actionConnectorAdd.deprecatedBannerMessage"
        defaultMessage="Only connectors created with the {aiConnectorLink} will remain. While you can still access existing connectors and create new ones with this flow, make sure to migrate in a timely manner to avoid interruptions in your workflow."
        values={{
          aiConnectorLink: (
            <EuiLink onClick={redirectToInferenceConnector}>
              <FormattedMessage
                id="xpack.stackConnectors.components.actionConnectorAdd.deprecatedBannerLinkTitle"
                defaultMessage="new AI Connector flow"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};

// eslint-disable-next-line import/no-default-export
export { DeprecatedAIConnectorCallOut as default };
