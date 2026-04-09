/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLink } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import {
  ADD_ENDPOINT_LABEL,
  EXTERNAL_INFERENCE_EMPTY_TITLE,
  EXTERNAL_INFERENCE_EMPTY_DESCRIPTION,
  VIEW_DOCUMENTATION_LINK,
} from '../../common/translations';
import { docLinks } from '../../common/doc_links';

interface ExternalInferenceEmptyPromptProps {
  onFlyoutOpen: () => void;
}

export const ExternalInferenceEmptyPrompt: React.FC<ExternalInferenceEmptyPromptProps> = ({
  onFlyoutOpen,
}) => {
  return (
    <KibanaPageTemplate.EmptyPrompt
      data-test-subj="externalInferenceEmptyPrompt"
      iconType="plusInCircle"
      title={<h2>{EXTERNAL_INFERENCE_EMPTY_TITLE}</h2>}
      body={<p>{EXTERNAL_INFERENCE_EMPTY_DESCRIPTION}</p>}
      actions={
        <EuiButton fill onClick={onFlyoutOpen} data-test-subj="addEndpointButton">
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
  );
};
