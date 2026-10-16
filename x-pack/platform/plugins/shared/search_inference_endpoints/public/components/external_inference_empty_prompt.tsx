/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { docLinks } from '../../common/doc_links';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { EventType } from '../analytics/constants';

interface ExternalInferenceEmptyPromptProps {
  canManage: boolean;
  onFlyoutOpen: () => void;
}

export const ExternalInferenceEmptyPrompt: React.FC<ExternalInferenceEmptyPromptProps> = ({
  canManage,
  onFlyoutOpen,
}) => {
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(EventType.EMPTY_STATE_VIEWED);
  }, [usageTracker]);
  return (
    <KibanaPageTemplate.EmptyPrompt
      data-test-subj="externalInferenceEmptyPrompt"
      iconType="machineLearningApp"
      title={
        <h2>
          {i18n.translate('xpack.searchInferenceEndpoints.externalInference.emptyTitle', {
            defaultMessage: 'External inference',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.searchInferenceEndpoints.externalInference.emptyDescription', {
            defaultMessage:
              'Connect to third-party or self-hosted models and use them with Elastic inference features.',
          })}
        </p>
      }
      actions={
        <EuiFlexGroup justifyContent="center" direction="column" alignItems="center">
          {canManage && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onFlyoutOpen}
                data-test-subj="addEndpointButton"
                iconType="plusCircle"
                iconSide="left"
              >
                {i18n.translate('xpack.searchInferenceEndpoints.addConnectorButtonLabel', {
                  defaultMessage: 'Add endpoint',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiLink
              href={docLinks.selfHostedInference}
              target="_blank"
              data-test-subj="selfHostedDocumentationLink"
              external
            >
              {i18n.translate(
                'xpack.searchInferenceEndpoints.externalInference.selfHostedLinkLabel',
                { defaultMessage: 'How to set up self-hosted models' }
              )}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      footer={
        <EuiLink
          href={docLinks.externalInference}
          target="_blank"
          external
          data-test-subj="viewDocumentationLink"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.providerInference.viewDocumentation', {
            defaultMessage: 'Learn about external inference',
          })}
        </EuiLink>
      }
    />
  );
};
