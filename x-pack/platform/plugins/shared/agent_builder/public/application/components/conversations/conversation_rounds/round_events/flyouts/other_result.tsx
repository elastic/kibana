/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';

const codeblockStyles = css`
  word-break: break-word;
`;

interface OtherResultProps {
  result: ToolResult;
}

/**
 * Fallback JSON-dump renderer for tool result types that don't have a
 * dedicated inline renderer (resource, resourceList, visualization, dashboard,
 * fileReference, other). Used only inside `ToolResponseFlyout`.
 */
export const OtherResult: React.FC<OtherResultProps> = ({ result }) => (
  <EuiCodeBlock
    language="json"
    fontSize="s"
    paddingSize="s"
    isCopyable={false}
    color="subdued"
    css={codeblockStyles}
  >
    {JSON.stringify(result.data, null, 2)}
  </EuiCodeBlock>
);
