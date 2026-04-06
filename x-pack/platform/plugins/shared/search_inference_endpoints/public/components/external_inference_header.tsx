/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import * as i18n from '../../common/translations';
import { EXTERNAL_INFERENCE_TITLE } from '../../common/constants';
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
      pageTitle={EXTERNAL_INFERENCE_TITLE}
      description={i18n.MANAGE_INFERENCE_ENDPOINTS_LABEL}
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
              {i18n.API_DOCUMENTATION_LINK}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="plusInCircle"
              fill
              data-test-subj="add-inference-endpoint-header-button"
              onClick={onFlyoutOpen}
            >
              {i18n.ADD_ENDPOINT_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>,
      ]}
    />
  );
};
