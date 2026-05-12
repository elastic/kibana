/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { createCasesInlineContent, type CasesAttachment } from './cases_inline_content';

interface Services {
  application: ApplicationStart;
}

export const createCasesAttachmentDefinition = (
  services: Services
): AttachmentUIDefinition<CasesAttachment> => {
  const InlineContent = createCasesInlineContent(services);
  return {
    getLabel: (attachment) =>
      i18n.translate('xpack.cases.agentBuilder.cases.label', {
        defaultMessage: '{count, plural, one {# case} other {# cases}}',
        values: { count: attachment.data.total },
      }),
    getIcon: () => 'casesApp',
    renderInlineContent: (props) => <InlineContent {...props} />,
  };
};
