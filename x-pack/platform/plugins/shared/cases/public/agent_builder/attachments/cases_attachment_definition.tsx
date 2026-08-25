/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { toCasesViewSpec } from '@kbn/adaptive-ui-adapters';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { createCasesInlineContent, type CasesAttachment } from './cases_inline_content';
import { toCaseAdapterData } from './to_case_adapter_data';
import { CASES_LABEL } from './translations';

interface Services {
  application: ApplicationStart;
}

export const createCasesAttachmentDefinition = (
  services: Services
): AttachmentUIDefinition<CasesAttachment> => {
  const InlineContent = createCasesInlineContent(services);
  return {
    getLabel: (attachment) => CASES_LABEL(attachment.data.total),
    getIcon: () => 'casesApp',
    getViewSpec: ({ data }) =>
      toCasesViewSpec({
        cases: data.cases.map(toCaseAdapterData),
        total: data.total,
        url: data.url ?? undefined,
      }),
    renderInlineContent: (props) => <InlineContent {...props} />,
  };
};
