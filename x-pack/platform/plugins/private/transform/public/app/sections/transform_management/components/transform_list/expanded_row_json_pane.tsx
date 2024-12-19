/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface Props {
  json: object;
}

export const ExpandedRowJsonPane: FC<Props> = ({ json }) => {
  // exclude alerting rules from the JSON
  if ('alerting_rules' in json) {
    const { alerting_rules: alertingRules, ...rest } = json;
    json = rest;
  }

  return (
    <div data-test-subj="transformJsonTabContent">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            aria-label={i18n.translate(
              'xpack.transform.transformList.transformDetails.expandedRowJsonPane',
              {
                defaultMessage: 'JSON of transform configuration',
              }
            )}
            fontSize="s"
            language="json"
            paddingSize="s"
            style={{ width: '100%' }}
            isCopyable
          >
            {JSON.stringify(json, null, 2)}
          </EuiCodeBlock>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>&nbsp;</EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
