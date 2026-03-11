/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public/common';

export const UsageCostMessage: React.FC = () => {
  const { docLinks } = useKibana().services;
  return (
    <EuiText size="xs">
      <FormattedMessage
        id="xpack.stackConnectors.inference.elasticLLM.descriptionText"
        defaultMessage="Learn more about {elasticLLM} and its {usageCost}."
        values={{
          elasticLLM: (
            <EuiLink
              data-test-subj="elasticManagedLlmLink"
              href={docLinks.links.observability.elasticManagedLlm}
              target="_blank"
              rel="noopener noreferrer"
              external
            >
              <FormattedMessage
                id="xpack.stackConnectors.inference.elasticLLM.link"
                defaultMessage="Elastic Managed LLM connector"
              />
            </EuiLink>
          ),
          usageCost: (
            <EuiLink
              href={docLinks.links.observability.elasticManagedLlmUsageCost}
              target="_blank"
              rel="noopener noreferrer"
              external
            >
              <FormattedMessage
                id="xpack.stackConnectors.inference.elasticLLM.usageCost.link"
                defaultMessage="usage cost"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
};
// eslint-disable-next-line import/no-default-export
export { UsageCostMessage as default };
