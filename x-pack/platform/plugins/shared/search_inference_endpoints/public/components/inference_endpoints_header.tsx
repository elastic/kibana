/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiButton, EuiLink } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../common/doc_links';
import { useKibana } from '../hooks/use_kibana';

interface InferenceEndpointsHeaderProps {
  onFlyoutOpen: () => void;
}
export const InferenceEndpointsHeader: React.FC<InferenceEndpointsHeaderProps> = ({
  onFlyoutOpen,
}) => {
  const {
    services: { application },
  } = useKibana();

  return (
    <EuiPageTemplate.Header
      data-test-subj="allInferenceEndpointsPage"
      pageTitle={i18n.translate('xpack.searchInferenceEndpoints.inferenceEndpointsTitle', {
        defaultMessage: 'Inference endpoints',
      })}
      description={i18n.translate(
        'xpack.searchInferenceEndpoints.allInferenceEndpoints.description',
        {
          defaultMessage:
            'Inference endpoints streamline the deployment and management of machine\nlearning models in Elasticsearch. Set up and manage NLP tasks using unique\nendpoints to build AI-powered search.',
        }
      )}
      bottomBorder={true}
      rightSideItems={[
        <EuiButton
          iconType="plusCircle"
          fill
          data-test-subj="add-inference-endpoint-header-button"
          onClick={onFlyoutOpen}
        >
          {i18n.translate('xpack.searchInferenceEndpoints.addConnectorButtonLabel', {
            defaultMessage: 'Add endpoint',
          })}
        </EuiButton>,
        <EuiLink
          aria-label={i18n.translate('xpack.searchInferenceEndpoints.apiDocumentationLink', {
            defaultMessage: 'API Documentation',
          })}
          target="_blank"
          data-test-subj="api-documentation"
          href={docLinks.createInferenceEndpoint}
          external
        >
          {i18n.translate('xpack.searchInferenceEndpoints.apiDocumentationLink', {
            defaultMessage: 'API Documentation',
          })}
        </EuiLink>,
        <EuiLink
          aria-label={i18n.translate('xpack.searchInferenceEndpoints.viewYourModels', {
            defaultMessage: 'ML Trained Models',
          })}
          onClick={() => application.navigateToApp('ml', { path: 'trained_models' })}
          data-test-subj="view-your-models"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.viewYourModels', {
            defaultMessage: 'ML Trained Models',
          })}
        </EuiLink>,
        <EuiLink
          aria-label={i18n.translate('xpack.searchInferenceEndpoints.eisDocumentationLink', {
            defaultMessage: 'Elastic Inference Service',
          })}
          href={docLinks.elasticInferenceService}
          target="_blank"
          data-test-subj="eis-documentation"
          external
        >
          {i18n.translate('xpack.searchInferenceEndpoints.eisDocumentationLink', {
            defaultMessage: 'Elastic Inference Service',
          })}
        </EuiLink>,
      ]}
    />
  );
};
