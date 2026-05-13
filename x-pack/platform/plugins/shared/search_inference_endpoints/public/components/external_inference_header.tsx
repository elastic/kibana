/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { docLinks } from '../../common/doc_links';

interface ExternalInferenceHeaderProps {
  onFlyoutOpen: () => void;
}

export const ExternalInferenceHeader: React.FC<ExternalInferenceHeaderProps> = ({
  onFlyoutOpen,
}) => {
  return (
    <EuiPageTemplate.Header
      data-test-subj="externalInferenceHeader"
      pageTitle={i18n.translate('xpack.searchInferenceEndpoints.externalInferenceTitle', {
        defaultMessage: 'External Inference',
      })}
      description={i18n.translate(
        'xpack.searchInferenceEndpoints.allInferenceEndpoints.description',
        {
          defaultMessage:
            'Inference endpoints streamline the deployment and management of machine learning models in Elasticsearch. Set up and manage NLP tasks using unique endpoints, to build AI-powered search.',
        }
      )}
      bottomBorder={true}
      rightSideItems={[
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLink
              target="_blank"
              data-test-subj="api-documentation"
              href={docLinks.createInferenceEndpoint}
              external
            >
              {i18n.translate('xpack.searchInferenceEndpoints.apiDocumentationLink', {
                defaultMessage: 'API Documentation',
              })}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="plusInCircle"
              fill
              data-test-subj="add-inference-endpoint-header-button"
              onClick={onFlyoutOpen}
            >
              {i18n.translate('xpack.searchInferenceEndpoints.addConnectorButtonLabel', {
                defaultMessage: 'Add endpoint',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>,
      ]}
    />
  );
};
