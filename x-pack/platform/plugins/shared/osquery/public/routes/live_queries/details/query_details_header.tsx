/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { QueryTitle } from './query_title';
import { RunBySubtitle } from './run_by_subtitle';
import { ScheduledRunSubtitle } from './scheduled_run_subtitle';
import { HeaderActions } from './header_actions';

const titleColumnCss = { minWidth: 0 };
const actionsColumnCss = { marginLeft: 'auto' };

interface QueryDetailsHeaderProps {
  actionId: string;
  data: LiveQueryDetailsItem;
  onSaveQuery?: () => void;
  scheduleId?: string;
  executionCount?: number;
  packName?: string;
  viewInStartDate?: string;
  viewInEndDate?: string;
}

const QueryDetailsHeaderComponent: React.FC<QueryDetailsHeaderProps> = ({
  actionId,
  data,
  onSaveQuery,
  scheduleId,
  executionCount,
  packName,
  viewInStartDate,
  viewInEndDate,
}) => {
  const query = data.queries?.[0]?.query ?? '';
  // Scheduled executions have no triggering user, so `Run by` would always say `Elastic`.
  const isScheduled = !!scheduleId && executionCount != null;

  return (
    <div data-test-subj="query-details-header">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem grow={true} css={titleColumnCss}>
          <QueryTitle query={query} />
          {isScheduled ? (
            <ScheduledRunSubtitle
              packName={packName}
              executionCount={executionCount}
              timestamp={data['@timestamp']}
            />
          ) : (
            <RunBySubtitle data={data} />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={actionsColumnCss}>
          <HeaderActions
            actionId={actionId}
            data={data}
            onSaveQuery={onSaveQuery}
            scheduleId={scheduleId}
            executionCount={executionCount}
            viewInStartDate={viewInStartDate}
            viewInEndDate={viewInEndDate}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </div>
  );
};

QueryDetailsHeaderComponent.displayName = 'QueryDetailsHeader';

export const QueryDetailsHeader = React.memo(QueryDetailsHeaderComponent);
