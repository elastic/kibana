/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { GEMINI, DOCUMENTATION_BASE as DOCUMENTATION } from './translations';

export enum ServiceProviderKeys {
  amazonbedrock = 'amazonbedrock',
  azureopenai = 'azureopenai',
  azureaistudio = 'azureaistudio',
  cohere = 'cohere',
  elasticsearch = 'elasticsearch',
  elastic = 'elastic',
  googleaistudio = 'googleaistudio',
  googlevertexai = 'googlevertexai',
  hugging_face = 'hugging_face',
  mistral = 'mistral',
  openai = 'openai',
  anthropic = 'anthropic',
  watsonxai = 'watsonxai',
  'alibabacloud-ai-search' = 'alibabacloud-ai-search',
  jinaai = 'jinaai',
}

export const GEMINI_REGION_DOC_LINK = (
  <EuiLink
    data-test-subj="gemini-vertexai-api-doc"
    href="https://cloud.google.com/vertex-ai/docs/reference/rest#rest_endpoints"
    external
    rel="noopener nofollow noreferrer"
  >
    {`${GEMINI} ${DOCUMENTATION}`}
  </EuiLink>
);

export const GEMINI_PROJECT_ID_DOC_LINK = (
  <EuiLink
    data-test-subj="gemini-api-doc"
    href="https://cloud.google.com/vertex-ai/docs/start/cloud-environment"
    external
    rel="noopener nofollow noreferrer"
  >
    {`${GEMINI} ${DOCUMENTATION}`}
  </EuiLink>
);

export const serviceProviderLinkComponents: Partial<
  Record<ServiceProviderKeys, Record<string, React.ReactNode>>
> = {
  [ServiceProviderKeys.googlevertexai]: {
    location: GEMINI_REGION_DOC_LINK,
    project_id: GEMINI_PROJECT_ID_DOC_LINK,
  },
};

export const DEFAULT_TASK_TYPE = 'completion';
