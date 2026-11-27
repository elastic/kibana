/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CatalogueComponentDefinition } from '@kbn/streams-schema';

const detailsStyles = css`
  white-space: pre-line;
`;

export const toDocumentationUrl = (documentation: string | undefined): string | undefined => {
  if (!documentation) {
    return undefined;
  }
  try {
    const { protocol, href } = new URL(documentation);
    return protocol === 'http:' || protocol === 'https:' ? href : undefined;
  } catch {
    return undefined;
  }
};

export const toProcessorHelp = (
  definition: CatalogueComponentDefinition | undefined
): React.ReactNode[] | undefined => {
  if (!definition) {
    return undefined;
  }
  const { help, description } = definition;
  const summary = help?.summary ?? description;
  const documentationUrl = toDocumentationUrl(help?.documentation);
  const lines: React.ReactNode[] = [];
  if (summary) {
    lines.push(summary);
  }
  if (help?.details) {
    lines.push(
      <span css={detailsStyles} data-test-subj="streamsProcessingFlyoutProcessorHelpDetails">
        {help.details}
      </span>
    );
  }
  if (documentationUrl) {
    lines.push(
      <EuiLink
        href={documentationUrl}
        target="_blank"
        external
        data-test-subj="streamsProcessingFlyoutProcessorHelpLink"
      >
        {i18n.translate('xpack.streams.processingFlyout.editor.documentationLink', {
          defaultMessage: 'Documentation',
        })}
      </EuiLink>
    );
  }
  return lines.length > 0 ? lines : undefined;
};
