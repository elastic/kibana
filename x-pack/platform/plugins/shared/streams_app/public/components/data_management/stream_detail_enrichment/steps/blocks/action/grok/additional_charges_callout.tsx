/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AIFeatures } from '../../../../../../../hooks/use_ai_features';
import { useKibana } from '../../../../../../../hooks/use_kibana';

export interface AdditionalChargesCalloutProps {
  aiFeatures: AIFeatures;
}

export const AdditionalChargesCallout = ({ aiFeatures }: AdditionalChargesCalloutProps) => {
  const {
    core: { docLinks },
  } = useKibana();

  return (
    <EuiCallOut onDismiss={() => aiFeatures.acknowledgeAdditionalCharges(true)}>
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.managedConnectorTooltip"
        defaultMessage="Elastic Managed LLM is the new default for generating patterns and incurs <costLink>additional charges</costLink>. Other LLM connectors remain available. <learnMoreLink>Learn more</learnMoreLink>"
        values={{
          costLink: (...chunks: React.ReactNode[]) => (
            <EuiLink
              href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </EuiLink>
          ),
          learnMoreLink: (...chunks: React.ReactNode[]) => (
            <EuiLink
              href={docLinks?.links?.observability?.elasticManagedLlm}
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
