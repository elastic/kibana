/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiButton, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { docLinks } from '../../common/doc_links';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { EventType } from '../analytics/constants';

interface ExternalInferenceEmptyPromptProps {
  onFlyoutOpen: () => void;
}

export const ExternalInferenceEmptyPrompt: React.FC<ExternalInferenceEmptyPromptProps> = ({
  onFlyoutOpen,
}) => {
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(EventType.EMPTY_STATE_VIEWED);
  }, [usageTracker]);
  return (
    <KibanaPageTemplate.EmptyPrompt
      data-test-subj="externalInferenceEmptyPrompt"
      iconType="plusInCircle"
      title={
        <h2>
          {i18n.translate('xpack.searchInferenceEndpoints.externalInference.emptyTitle', {
            defaultMessage: 'Connect to external model providers',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.searchInferenceEndpoints.externalInference.emptyDescription', {
            defaultMessage:
              'Add model endpoints from your favorite model providers to use them for AI-powered search.',
          })}
        </p>
      }
      actions={
        <EuiButton fill onClick={onFlyoutOpen} data-test-subj="addEndpointButton">
          {i18n.translate('xpack.searchInferenceEndpoints.addConnectorButtonLabel', {
            defaultMessage: 'Add endpoint',
          })}
        </EuiButton>
      }
      footer={
        <EuiLink
          href={docLinks.createInferenceEndpoint}
          target="_blank"
          external
          data-test-subj="viewDocumentationLink"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.providerInference.viewDocumentation', {
            defaultMessage: 'View documentation',
          })}
        </EuiLink>
      }
    />
  );
};
