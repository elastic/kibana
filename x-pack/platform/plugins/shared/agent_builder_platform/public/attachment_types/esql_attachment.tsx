/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeBlock } from '@elastic/eui';
import type { EsqlAttachment } from '@kbn/agent-builder-common/attachments';
import type { ILocatorClient } from '@kbn/share-plugin/common/url_service';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import { css } from '@emotion/react';

/**
 * Component that renders inline ESQL query content
 */
const EsqlInlineContent: React.FC<AttachmentRenderProps<EsqlAttachment>> = ({ attachment }) => (
  <EuiCodeBlock
    language="esql"
    fontSize="s"
    overflowHeight={300}
    lineNumbers
    css={css`
      width: 100%;
      & pre {
        margin-block-end: 0;
      }
    `}
  >
    {attachment.data.query}
  </EuiCodeBlock>
);

/**
 * Factory function that creates the ESQL attachment UI definition.
 * Captures the locators at registration time for URL generation.
 */
export const createEsqlAttachmentDefinition = ({
  locators,
}: {
  locators: ILocatorClient;
}): AttachmentUIDefinition<EsqlAttachment> => {
  const getDiscoverUrl = (esqlQuery: string): string | undefined => {
    const discoverLocator = locators.get('DISCOVER_APP_LOCATOR');
    return discoverLocator?.getRedirectUrl({ query: { esql: esqlQuery } });
  };

  return {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.esql.label', {
        defaultMessage: 'ES|QL query',
      }),
    getIcon: () => 'editorCodeBlock',
    renderInlineContent: (props) => <EsqlInlineContent {...props} />,
    renderCanvasContent: undefined,
    getActionButtons: ({ attachment }) => [
      {
        label: i18n.translate('xpack.agentBuilderPlatform.attachments.esql.run', {
          defaultMessage: 'Run',
        }),
        icon: 'play',
        type: ActionButtonType.PRIMARY,
        handler: () => {
          const discoverUrl = getDiscoverUrl(attachment.data.query);
          if (discoverUrl) {
            window.open(discoverUrl, '_blank');
          }
        },
      },
      {
        label: i18n.translate('xpack.agentBuilderPlatform.attachments.esql.copy', {
          defaultMessage: 'Copy',
        }),
        icon: 'copy',
        type: ActionButtonType.SECONDARY,
        handler: async () => {
          await navigator.clipboard.writeText(attachment.data.query);
        },
      },
    ],
  };
};
