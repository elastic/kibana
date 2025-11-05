/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/onechat-common';
import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { appPaths } from '../../../../../../utils/app_paths';
import { useNavigation } from '../../../../../../hooks/use_navigation';
import { ThinkingItemLayout } from './thinking_item_layout';

const toolCallLabel = i18n.translate('xpack.onechat.thinking.toolCallLabel', {
  defaultMessage: 'Tool call',
});
const toolLinkLabel = i18n.translate('xpack.onechat.thinking.toolLinkLabel', {
  defaultMessage: 'View tool details',
});

export const ToolCallThinkingItem: React.FC<{
  step: ToolCallStep;
}> = ({ step: { tool_id: toolId } }) => {
  const { createOnechatUrl } = useNavigation();
  const toolHref = createOnechatUrl(appPaths.tools.details({ toolId }));
  const toolLinkId = `tool-link-${toolId}`;

  return (
    <ThinkingItemLayout>
      <EuiText size="s">
        <p role="status" aria-label={toolCallLabel}>
          <FormattedMessage
            id="xpack.onechat.thinking.toolCallThinkingItem"
            defaultMessage="Calling tool {tool}"
            values={{
              tool: (
                <code>
                  <EuiLink
                    href={toolHref}
                    target="_blank"
                    id={toolLinkId}
                    aria-label={`${toolLinkLabel} ${toolId}`}
                    rel="noopener noreferrer"
                  >
                    {toolId}
                  </EuiLink>
                </code>
              ),
            }}
          />
        </p>
      </EuiText>
    </ThinkingItemLayout>
  );
};
