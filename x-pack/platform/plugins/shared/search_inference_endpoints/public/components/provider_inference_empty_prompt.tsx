/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLink, EuiPageTemplate } from '@elastic/eui';

import {
  ADD_ENDPOINT_LABEL,
  PROVIDER_INFERENCE_EMPTY_TITLE,
  PROVIDER_INFERENCE_EMPTY_DESCRIPTION,
  VIEW_DOCUMENTATION_LINK,
} from '../../common/translations';
import { docLinks } from '../../common/doc_links';

interface ProviderInferenceEmptyPromptProps {
  onFlyoutOpen: () => void;
}

export const ProviderInferenceEmptyPrompt: React.FC<ProviderInferenceEmptyPromptProps> = ({
  onFlyoutOpen,
}) => {
  return (
    <EuiPageTemplate.Section alignment="center" data-test-subj="providerInferenceEmptyPrompt">
      <EuiEmptyPrompt
        iconType="plusInCircle"
        title={<h2>{PROVIDER_INFERENCE_EMPTY_TITLE}</h2>}
        body={<p>{PROVIDER_INFERENCE_EMPTY_DESCRIPTION}</p>}
        actions={
          <EuiButton
            fill
            iconType="plusInCircle"
            onClick={onFlyoutOpen}
            data-test-subj="addEndpointButton"
          >
            {ADD_ENDPOINT_LABEL}
          </EuiButton>
        }
        footer={
          <EuiLink
            href={docLinks.createInferenceEndpoint}
            target="_blank"
            external
            data-test-subj="viewDocumentationLink"
          >
            {VIEW_DOCUMENTATION_LINK}
          </EuiLink>
        }
      />
    </EuiPageTemplate.Section>
  );
};
