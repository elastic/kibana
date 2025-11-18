/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { QueryResult } from '@kbn/agent-builder-common/tools/tool_result';
import React from 'react';

interface QueryResultStepProps {
  result: QueryResult;
}

export const QueryResultStep: React.FC<QueryResultStepProps> = ({ result: { data } }) => {
  const { euiTheme } = useEuiTheme();
  const codeBlockStyles = css`
    background-color: ${euiTheme.colors.lightestShade};
    & .euiCodeBlock__controls {
      background: none;
    }
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiCodeBlock css={codeBlockStyles} language="esql" isCopyable paddingSize="m">
          {data.esql}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
