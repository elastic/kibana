/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { esFilters } from '../../../../../../../../../src/plugins/data/common/es_query';
import { DEFAULT_SIGNALS_INDEX } from '../../../../../common/constants';
import { StatefulEventsViewer } from '../../../../components/events_viewer';
import { GlobalTime } from '../../../../containers/global_time';

import { OpenSignals } from './open_signals';
import { ClosedSignals } from './closed_signals';
import { signalsClosedFilters, signalsDefaultModel, signalsOpenFilters } from './default_config';
import * as i18n from './translations';

const SIGNALS_PAGE_TIMELINE_ID = 'signals-page';
const FILTER_OPEN = 'open';
const FILTER_CLOSED = 'closed';

export const SignalsTableFilterGroup = React.memo(
  ({ onFilterGroupChanged }: { onFilterGroupChanged: (filterGroup: string) => void }) => {
    const [filterGroup, setFilterGroup] = useState(FILTER_OPEN);

    return (
      <EuiFilterGroup>
        <EuiFilterButton
          hasActiveFilters={filterGroup === FILTER_OPEN}
          onClick={() => {
            setFilterGroup(FILTER_OPEN);
            onFilterGroupChanged(FILTER_OPEN);
          }}
          withNext
        >
          {'Open signals'}
        </EuiFilterButton>

        <EuiFilterButton
          hasActiveFilters={filterGroup === FILTER_CLOSED}
          onClick={() => {
            setFilterGroup(FILTER_CLOSED);
            onFilterGroupChanged(FILTER_CLOSED);
          }}
        >
          {'Closed signals'}
        </EuiFilterButton>
      </EuiFilterGroup>
    );
  }
);

interface SignalsTableProps {
  defaultFilters?: esFilters.Filter[];
}

export const SignalsTable = React.memo<SignalsTableProps>(({ defaultFilters = [] }) => {
  const [filterGroup, setFilterGroup] = useState(FILTER_OPEN);

  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: string) => {
      setFilterGroup(newFilterGroup);
    },
    [setFilterGroup]
  );

  const getUtilityBar = useCallback(
    (totalCount: number) =>
      filterGroup === FILTER_OPEN ? (
        <OpenSignals totalCount={totalCount} />
      ) : (
        <ClosedSignals totalCount={totalCount} />
      ),
    [filterGroup]
  );

  const defaultIndices = useMemo(() => [`${DEFAULT_SIGNALS_INDEX}-default`], [
    DEFAULT_SIGNALS_INDEX,
  ]);
  const defaultFiltersMemo = useMemo(
    () => [
      ...defaultFilters,
      ...(filterGroup === FILTER_OPEN ? signalsOpenFilters : signalsClosedFilters),
    ],
    [defaultFilters, filterGroup]
  );

  return (
    <>
      <GlobalTime>
        {({ to, from, setQuery, deleteQuery, isInitializing }) => (
          <StatefulEventsViewer
            defaultIndices={defaultIndices}
            defaultFilters={defaultFiltersMemo}
            defaultModel={signalsDefaultModel}
            end={to}
            headerFilterGroup={
              <SignalsTableFilterGroup onFilterGroupChanged={onFilterGroupChangedCallback} />
            }
            id={SIGNALS_PAGE_TIMELINE_ID}
            start={from}
            timelineTypeContext={{
              documentType: i18n.SIGNALS_DOCUMENT_TYPE,
              footerText: i18n.TOTAL_COUNT_OF_SIGNALS,
              showCheckboxes: true,
              showRowRenderers: false,
              title: i18n.SIGNALS_TABLE_TITLE,
            }}
            utilityBar={getUtilityBar}
          />
        )}
      </GlobalTime>
    </>
  );
});

SignalsTable.displayName = 'SignalsTable';
