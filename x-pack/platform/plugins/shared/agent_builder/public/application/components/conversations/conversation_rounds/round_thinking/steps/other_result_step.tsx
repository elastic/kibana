/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, useEuiTheme } from '@elastic/eui';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { codeblockStyles } from './codeblock.styles';

interface OtherResultStepProps {
  result: ToolResult;
}

/**
 * Attempts to pretty-print data for display. If string values within the data
 * contain valid JSON, they are parsed and inlined so the output is a single
 * well-formatted JSON tree instead of escaped strings with `\n` literals.
 */
const formatResultData = (data: unknown): string => {
  try {
    const expandJsonStrings = (value: unknown): unknown => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'object' && parsed !== null) {
            return expandJsonStrings(parsed);
          }
        } catch {
          // not JSON, return as-is
        }
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(expandJsonStrings);
      }
      if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expandJsonStrings(v)]));
      }
      return value;
    };

    const expanded = expandJsonStrings(data);
    return JSON.stringify(expanded, null, 2);
  } catch {
    return JSON.stringify(data, null, 2);
  }
};

export const OtherResultStep: React.FC<OtherResultStepProps> = ({ result }) => {
  const { euiTheme } = useEuiTheme();
  const paddingLeftStyles = css`
    padding-left: ${euiTheme.size.xl};
  `;

  const formattedData = useMemo(() => formatResultData(result.data), [result.data]);

  return (
    <div css={paddingLeftStyles}>
      <EuiCodeBlock
        language="json"
        fontSize="s"
        paddingSize="s"
        isCopyable
        color="subdued"
        css={codeblockStyles}
        overflowHeight={400}
      >
        {formattedData}
      </EuiCodeBlock>
    </div>
  );
};
