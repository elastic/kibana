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
import {
  ActionButtonType,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
  type GetActionButtonsParams,
} from '@kbn/agent-builder-browser/attachments';

/**
 * Component that renders inline ESQL query content
 */
const EsqlInlineContent: React.FC<AttachmentRenderProps<EsqlAttachment>> = ({ attachment }) => {
  return (
    <EuiCodeBlock language="esql" fontSize="s" overflowHeight={300} lineNumbers>
      {attachment.data.query}
    </EuiCodeBlock>
  );
};

/**
 * Action buttons for ESQL attachments
 */
const getEsqlActionButtons = ({
  attachment,
  openCanvas,
}: GetActionButtonsParams<EsqlAttachment>) => {
  return [
    {
      label: i18n.translate('xpack.agentBuilderPlatform.attachments.esql.run', {
        defaultMessage: 'Run',
      }),
      icon: 'play',
      type: ActionButtonType.PRIMARY,
      handler: () => {
        openCanvas();
      },
    },
    {
      label: i18n.translate('xpack.agentBuilderPlatform.attachments.esql.copy', {
        defaultMessage: 'Copy query',
      }),
      icon: 'copy',
      type: ActionButtonType.SECONDARY,
      handler: async () => {
        await navigator.clipboard.writeText(attachment.data.query);
      },
    },
  ];
};

/**
 * UI definition for ESQL attachments
 */
export const esqlAttachmentDefinition: AttachmentUIDefinition<EsqlAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.agentBuilderPlatform.attachments.esql.label', {
      defaultMessage: 'ES|QL query',
    }),
  getIcon: () => 'editorCodeBlock',
  renderInlineContent: (props) => <EsqlInlineContent {...props} />,
  getActionButtons: getEsqlActionButtons,
};
