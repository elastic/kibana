/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import { HeaderSection } from '../../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';
import { columns } from './columns';
import { ColumnTypes, PageTypes, SortTypes } from './types';

export const ActivityMonitor = React.memo(() => {
  const sampleTableData: ColumnTypes[] = [
    {
      id: 1,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Running',
    },
    {
      id: 2,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Stopped',
    },
    {
      id: 3,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Fail',
    },
    {
      id: 4,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 5,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 6,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 7,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 8,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 9,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 10,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 11,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 12,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 13,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 14,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 15,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 16,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 17,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 18,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 19,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 20,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 21,
      rule: {
        href: '#/detections/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
  ];

  const [itemsTotalState] = useState<number>(sampleTableData.length);
  const [pageState, setPageState] = useState<PageTypes>({ index: 0, size: 20 });
  // const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'ran', direction: 'desc' });

  const handleChange = useCallback(
    ({ page, sort }: { page?: PageTypes; sort?: SortTypes }) => {
      setPageState(page!);
      setSortState(sort!);
    },
    [setPageState, setSortState]
  );

  return (
    <>
      <EuiSpacer />

      <EuiPanel>
        <HeaderSection title="Activity monitor" />
        <UtilityBar border>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>{'Showing: 39 activites'}</UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarText>{'Selected: 2 activities'}</UtilityBarText>

              <UtilityBarAction iconType="stop">{'Stop selected'}</UtilityBarAction>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
        {
          // @ts-ignore `Columns` interface differs from EUI's `column` type and is used all over this plugin, so ignore the differences instead of refactoring a lot of code
        }
        <EuiBasicTable
          columns={columns}
          isSelectable
          itemId="id"
          items={sampleTableData}
          onChange={handleChange}
          pagination={{
            pageIndex: pageState.index,
            pageSize: pageState.size,
            totalItemCount: itemsTotalState,
            pageSizeOptions: [5, 10, 20],
          }}
          selection={{
            selectable: (item: ColumnTypes) => item.status !== 'Completed',
            selectableMessage: (selectable: boolean) =>
              selectable ? '' : 'Completed runs cannot be acted upon',
            onSelectionChange: (selectedItems: ColumnTypes[]) => {
              // setSelectedState(selectedItems);
            },
          }}
          sorting={{
            sort: sortState,
          }}
        />
      </EuiPanel>
    </>
  );
});
ActivityMonitor.displayName = 'ActivityMonitor';
