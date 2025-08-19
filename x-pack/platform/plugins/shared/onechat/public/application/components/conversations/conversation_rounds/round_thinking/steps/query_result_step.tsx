/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { QueryResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';

interface QueryResultStepProps {
  result: QueryResult;
}

export const QueryResultStep: React.FC<QueryResultStepProps> = ({ result: { data } }) => {
  const dsl = 'dsl' in data && data.dsl;
  const esql = 'esql' in data && data.esql;
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        {esql && (
          <EuiCodeBlock language="sql" isCopyable paddingSize="none">
            {esql}
          </EuiCodeBlock>
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        {dsl && (
          <EuiCodeBlock language="json" isCopyable paddingSize="none">
            {JSON.stringify(dsl, null, 2)}
          </EuiCodeBlock>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
