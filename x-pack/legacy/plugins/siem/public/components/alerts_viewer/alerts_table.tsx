/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';

import { esFilters } from '../../../../../../../src/plugins/data/common/es_query';
import { StatefulEventsViewer } from '../events_viewer';
import * as i18n from './translations';
import { alertsDefaultModel } from './default_headers';

export interface OwnProps {
  end: number;
  id: string;
  start: number;
}

const ALERTS_TABLE_ID = 'timeline-alerts-table';
const filter: esFilters.Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'event.kind',
    params: {
      query: 'alert',
    },
  },
  query: {
    bool: {
      filter: [
        {
          bool: {
            should: [
              {
                match: {
                  'event.kind': 'alert',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  },
};

export const AlertsTable = React.memo(
  ({
    endDate,
    startDate,
    pageFilters,
    defaultFilters,
  }: {
    endDate: number;
    startDate: number;
    pageFilters: esFilters.Filter[];
    defaultFilters?: esFilters.Filter[];
  }) => {
    const alertsFilter = useMemo(() => [filter, ...pageFilters], [filter, pageFilters]);
    return (
      <StatefulEventsViewer
        pageFilters={alertsFilter}
        defaultFilters={defaultFilters}
        defaultModel={alertsDefaultModel}
        end={endDate}
        id={ALERTS_TABLE_ID}
        start={startDate}
        timelineTypeContext={{
          documentType: i18n.ALERTS_DOCUMENT_TYPE,
          footerText: i18n.TOTAL_COUNT_OF_ALERTS,
          showCheckboxes: false,
          showRowRenderers: false,
          title: i18n.ALERTS_TABLE_TITLE,
        }}
      />
    );
  }
);
