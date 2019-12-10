/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { OpenSignals } from './components/open_signals';
import { ClosedSignals } from './components/closed_signals';
import { GlobalTime } from '../../../../containers/global_time';
import { StatefulEventsViewer } from '../../../../components/events_viewer';
import * as i18n from './translations';
import { DEFAULT_SIGNALS_INDEX } from '../../../../../common/constants';
import { signalsClosedFilters, signalsDefaultModel, signalsOpenFilters } from './default_config';

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

export const SignalsTable = React.memo(() => {
  const [filterGroup, setFilterGroup] = useState(FILTER_OPEN);

  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: string) => {
      setFilterGroup(newFilterGroup);
    },
    [setFilterGroup]
  );

  return (
    <>
      <GlobalTime>
        {({ to, from, setQuery, deleteQuery, isInitializing }) => (
          <StatefulEventsViewer
            defaultIndices={[`${DEFAULT_SIGNALS_INDEX}-default`]}
            defaultFilters={filterGroup === FILTER_OPEN ? signalsOpenFilters : signalsClosedFilters}
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
            utilityBar={(totalCount: number) =>
              filterGroup === FILTER_OPEN ? (
                <OpenSignals totalCount={totalCount} />
              ) : (
                <ClosedSignals totalCount={totalCount} />
              )
            }
          />
        )}
      </GlobalTime>
    </>
  );
});

SignalsTable.displayName = 'SignalsTable';
