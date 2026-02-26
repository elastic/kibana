/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel } from '@elastic/eui';

export interface RecentDocsActionMessageProps {
  numOfDocs: number;
}

export const RecentDocsActionMessage: React.FC<RecentDocsActionMessageProps> = ({ numOfDocs }) => {
  return (
    <EuiPanel hasBorder={false} hasShadow={false} color="subdued" borderRadius="none">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiIcon aria-hidden={true} type="calendar" />
        </EuiFlexItem>
        <EuiFlexItem>
          <p>
            {i18n.translate('xpack.idxMgmt.indexDetails.recentDocsActionMessage', {
              defaultMessage:
                'You are viewing a sample of {pageSize, plural, one {# document} other {# documents}} ingested in this index.',
              values: {
                pageSize: numOfDocs,
              },
            })}
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
