/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, useEuiTheme } from '@elastic/eui';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';
import { css } from '@emotion/react';

interface OtherResultStepProps {
  result: ToolResult;
}

export const OtherResultStep: React.FC<OtherResultStepProps> = ({ result }) => {
  const { euiTheme } = useEuiTheme();
  const paddingLeftStyles = css`
    padding-left: ${euiTheme.size.xl};
  `;
  return (
    <div css={paddingLeftStyles}>
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable={false} color="subdued">
        {JSON.stringify(result.data, null, 2)}
      </EuiCodeBlock>
    </div>
  );
};
