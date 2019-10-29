/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTabbedContent,
  EuiTextColor,
} from '@elastic/eui';
import moment from 'moment';
import React, { useState } from 'react';
import { StickyContainer } from 'react-sticky';

import { getEmptyTagValue } from '../../../components/empty_value';
import { FiltersGlobal } from '../../../components/filters_global';
import { HeaderPage } from '../../../components/header_page';
import { HeaderSection } from '../../../components/header_section';
import { HistogramSignals } from '../../../components/page/detection_engine/histogram_signals';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../components/utility_bar';
import { SpyRoute } from '../../../utils/route/spy_routes';
import { DetectionEngineKql } from '../kql';
import * as i18n from './translations';

// Michael: Will need to change this to get the current datetime format from Kibana settings.
const dateTimeFormat = (value: string) => {
  return moment(value).format('M/D/YYYY, h:mm A');
};

const OpenSignals = React.memo(() => {
  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{'Showing: 439 signals'}</UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarText>{'Selected: 20 signals'}</UtilityBarText>

            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={<p>{'Batch actions context menu here.'}</p>}
            >
              {'Batch actions'}
            </UtilityBarAction>

            <UtilityBarAction iconType="listAdd">
              {'Select all signals on all pages'}
            </UtilityBarAction>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>

            <UtilityBarAction iconType="cross">{'Clear aggregation'}</UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>

        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={<p>{'Customize columns context menu here.'}</p>}
            >
              {'Customize columns'}
            </UtilityBarAction>

            <UtilityBarAction iconType="indexMapping">{'Aggregate data'}</UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Michael: Open signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
    </>
  );
});

const ClosedSignals = React.memo(() => {
  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{'Showing: 439 signals'}</UtilityBarText>
          </UtilityBarGroup>
        </UtilityBarSection>

        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={<p>{'Customize columns context menu here.'}</p>}
            >
              {'Customize columns'}
            </UtilityBarAction>

            <UtilityBarAction iconType="indexMapping">{'Aggregate data'}</UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Michael: Closed signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
    </>
  );
});

const Signals = React.memo(() => {
  const sampleChartOptions = [
    { text: 'Risk scores', value: 'risk_scores' },
    { text: 'Severities', value: 'severities' },
    { text: 'Top destination IPs', value: 'destination_ips' },
    { text: 'Top event actions', value: 'event_actions' },
    { text: 'Top event categories', value: 'event_categories' },
    { text: 'Top host names', value: 'host_names' },
    { text: 'Top source IPs', value: 'source_ips' },
    { text: 'Top users', value: 'users' },
  ];

  const filterGroupOptions = ['open', 'closed'];
  const [filterGroupState, setFilterGroupState] = useState(filterGroupOptions[0]);

  return (
    <>
      <EuiSpacer />

      <EuiPanel>
        <HeaderSection title="Signal detection frequency">
          <EuiSelect
            options={sampleChartOptions}
            prepend="Stack by"
            value={sampleChartOptions[0].value}
          />
        </HeaderSection>

        <HistogramSignals />
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel>
        <HeaderSection title="All signals">
          <EuiFilterGroup>
            <EuiFilterButton
              hasActiveFilters={filterGroupState === filterGroupOptions[0]}
              onClick={() => setFilterGroupState(filterGroupOptions[0])}
              withNext
            >
              {'Open signals'}
            </EuiFilterButton>

            <EuiFilterButton
              hasActiveFilters={filterGroupState === filterGroupOptions[1]}
              onClick={() => setFilterGroupState(filterGroupOptions[1])}
            >
              {'Closed signals'}
            </EuiFilterButton>
          </EuiFilterGroup>
        </HeaderSection>

        {filterGroupState === filterGroupOptions[0] ? <OpenSignals /> : <ClosedSignals />}
      </EuiPanel>
    </>
  );
});
Signals.displayName = 'Signals';

const ActivityMonitor = React.memo(() => {
  interface ColumnTypes {
    id: number;
    ran: string;
    lookedBackTo: string;
    status: string;
    response: string | undefined;
  }

  interface PageTypes {
    index: number;
    size: number;
  }

  interface SortTypes {
    field: string;
    direction: string;
  }

  const actions = [
    {
      available: (item: ColumnTypes) => item.status === 'Running',
      description: 'Stop',
      icon: 'stop',
      isPrimary: true,
      name: 'Stop',
      onClick: () => {},
      type: 'icon',
    },
    {
      available: (item: ColumnTypes) => item.status === 'Stopped',
      description: 'Resume',
      icon: 'play',
      isPrimary: true,
      name: 'Resume',
      onClick: () => {},
      type: 'icon',
    },
  ];

  // Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
  const columns = [
    {
      field: 'ran',
      name: 'Ran',
      render: (value: ColumnTypes['ran']) => <time dateTime={value}>{dateTimeFormat(value)}</time>,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lookedBackTo',
      name: 'Looked back to',
      render: (value: ColumnTypes['lookedBackTo']) => (
        <time dateTime={value}>{dateTimeFormat(value)}</time>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'status',
      name: 'Status',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'response',
      name: 'Response',
      render: (value: ColumnTypes['response']) => {
        return value === undefined ? (
          getEmptyTagValue()
        ) : (
          <>
            {value === 'Fail' ? (
              <EuiTextColor color="danger">
                {value} <EuiIconTip content="Full fail message here." type="iInCircle" />
              </EuiTextColor>
            ) : (
              <EuiTextColor color="secondary">{value}</EuiTextColor>
            )}
          </>
        );
      },
      sortable: true,
      truncateText: true,
    },
    {
      actions,
      width: '40px',
    },
  ];

  const sampleTableData = [
    {
      id: 1,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Running',
    },
    {
      id: 2,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Stopped',
    },
    {
      id: 3,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Fail',
    },
    {
      id: 4,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 5,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 6,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 7,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 8,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 9,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 10,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 11,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 12,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 13,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 14,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 15,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 16,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 17,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 18,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 19,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 20,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 21,
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
  ];

  const [itemsTotalState, setItemsTotalState] = useState<number>(sampleTableData.length);
  const [pageState, setPageState] = useState<PageTypes>({ index: 0, size: 20 });
  const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'ran', direction: 'desc' });

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

        <EuiBasicTable
          columns={columns}
          isSelectable
          itemId="id"
          items={sampleTableData}
          onChange={({ page, sort }: { page: PageTypes; sort: SortTypes }) => {
            setPageState(page);
            setSortState(sort);
          }}
          pagination={{
            pageIndex: pageState.index,
            pageSize: pageState.size,
            totalItemCount: itemsTotalState,
            pageSizeOptions: [5, 10, 20],
          }}
          selection={{
            selectable: (item: ColumnTypes) => item.status !== 'Completed',
            selectableMessage: (selectable: boolean) =>
              selectable ? undefined : 'Completed runs cannot be acted upon',
            onSelectionChange: (selectedItems: ColumnTypes[]) => {
              setSelectedState(selectedItems);
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

export const RuleDetailsComponent = React.memo(() => {
  return (
    <>
      <StickyContainer>
        <FiltersGlobal>
          <DetectionEngineKql />
        </FiltersGlobal>

        <HeaderPage
          backOptions={{ href: '#detection-engine/rules', text: 'Back to rules' }}
          badgeOptions={{ text: 'Experimental' }}
          border
          subtitle={[
            'Created by: mmarcialis on 12/28/2019, 12:00 PM',
            'Updated by: agoldstein on 12/28/2019, 12:00 PM',
          ]}
          subtitle2="Last signal: 23 minutes ago"
          title="Automated exfiltration"
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiSwitch label="Activate rule" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                href="#detection-engine/rules/rule-details/edit-rule"
                iconType="visControls"
              >
                {'Edit rule settings'}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonIcon iconType="boxesHorizontal" aria-label="Additional actions" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>

        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiPanel>
              <HeaderSection title="Definition" />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <EuiPanel>
              <HeaderSection title="About" />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={1}>
            <EuiPanel>
              <HeaderSection title="Schedule" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiTabbedContent
          tabs={[
            {
              id: 'tabSignals',
              name: 'Signals',
              content: <Signals />,
            },
            {
              id: 'tabActivityMonitor',
              name: 'Activity monitor',
              content: <ActivityMonitor />,
            },
          ]}
        />
      </StickyContainer>

      <SpyRoute />
    </>
  );
});
RuleDetailsComponent.displayName = 'RuleDetailsComponent';
