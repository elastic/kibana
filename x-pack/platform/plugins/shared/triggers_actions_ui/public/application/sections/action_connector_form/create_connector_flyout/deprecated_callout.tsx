/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiIcon, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  name: string;
  id: string;
  onClick: (id: string) => void;
}

const DeprecatedCallOutComponent: React.FC<Props> = ({ id, name, onClick }) => (
  <EuiCallOut
    title={
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.actionConnectorAdd.deprecatedBannerTitle"
        defaultMessage="{icon} {connectorName} is deprecated"
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
      id="xpack.triggersActionsUI.sections.actionConnectorAdd.deprecatedBannerMessage"
      defaultMessage="To keep up with GenAI innovation and take advantage of our Inference service, we will deprecate this connector in a future update. Consider using the {aiConnectorLink} instead."
      values={{
        aiConnectorLink: (
          <EuiLink onClick={() => onClick(id)}>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.actionConnectorAdd.deprecatedBannerLinkTitle"
              defaultMessage="AI Connector"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiCallOut>
);

export const DeprecatedAIConnectorCallOut = memo(DeprecatedCallOutComponent);
