/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface Props {
  json: object;
  dataTestSubj: string;
}

export const ExpandedRowJsonPane: FC<Props> = ({ json, dataTestSubj }) => {
  return (
    <EuiFlexGroup data-test-subj={dataTestSubj}>
      <EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiCodeBlock
          aria-label={i18n.translate(
            'xpack.ml.dataframe.analyticsList.analyticsDetails.expandedRowJsonPane',
            {
              defaultMessage: 'JSON of data frame analytics configuration',
            }
          )}
          style={{ width: '100%' }}
          language="json"
          fontSize="s"
          paddingSize="s"
          overflowHeight={300}
          isCopyable
          data-test-subj={`mlAnalyticsDetailsJsonPreview`}
        >
          {JSON.stringify(json, null, 2)}
        </EuiCodeBlock>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>&nbsp;</EuiFlexItem>
    </EuiFlexGroup>
  );
};
