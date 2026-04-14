/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { AddToTimelineHandler } from '../types';

export interface ResultsTableComponentProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  ecsMapping?: ECSMapping;
  endDate?: string;
  startDate?: string;
  liveQueryActionId?: string;
  error?: string;
  addToTimeline?: AddToTimelineHandler;
  scheduleId?: string;
  executionCount?: number;
}

export const PaginationLimitToastContent = () => (
  <>
    <p>
      <FormattedMessage
        id="xpack.osquery.results.paginationLimitDescription"
        defaultMessage="Results limited to first 10,000 documents. To see all results, please use the {viewInDiscoverButton} button."
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        values={{
          viewInDiscoverButton: <strong>&quot;View in Discover&quot;</strong>,
        }}
      />
    </p>
    <p>
      <FormattedMessage
        id="xpack.osquery.results.paginationLimitIndexAccess"
        defaultMessage="Read access to {indexName} index is required."
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        values={{
          indexName: <EuiCode>logs-osquery_manager.results</EuiCode>,
        }}
      />
    </p>
  </>
);

export const euiProgressCss = {
  marginTop: '-2px',
};
