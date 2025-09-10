/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText } from '@elastic/eui';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface TabularDataResultStepProps {
  result: TabularDataResult;
}

export const TabularDataResultStep: React.FC<TabularDataResultStepProps> = ({
  result: { data },
}) => {
  return (
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.onechat.converation.thinking.toolResult.tabularData"
          defaultMessage={
            'Found {recordCount, plural, one {{recordCount, number} record} other {{recordCount, number} records}}'
          }
          values={{ recordCount: data.values.length }}
        />
      </p>
    </EuiText>
  );
};
