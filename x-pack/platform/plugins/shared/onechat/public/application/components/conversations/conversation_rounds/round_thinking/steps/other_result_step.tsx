/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';

interface OtherResultStepProps {
  result: ToolResult;
}

export const OtherResultStep: React.FC<OtherResultStepProps> = ({ result }) => {
  return (
    <EuiCodeBlock
      language="json"
      fontSize="s"
      paddingSize="s"
      isCopyable={false}
      transparentBackground
    >
      {JSON.stringify(result.data, null, 2)}
    </EuiCodeBlock>
  );
};
