/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiPopover,
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
import { ProgressInline } from '../../../components/progress_inline';
import { SiemSearchBar } from '../../../components/search_bar';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../components/detection_engine/utility_bar';
import { WrapperPage } from '../../../components/wrapper_page';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../../containers/source';
import { SpyRoute } from '../../../utils/route/spy_routes';
import { DetectionEngineEmptyPage } from '../detection_engine_empty_page';
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
              popoverContent={() => <p>{'Batch actions context menu here.'}</p>}
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
              popoverContent={() => <p>{'Customize columns context menu here.'}</p>}
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

OpenSignals.displayName = 'OpenSignals';

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
              popoverContent={() => <p>{'Customize columns context menu here.'}</p>}
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

ClosedSignals.displayName = 'ClosedSignals';

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
            onChange={() => {}}
            prepend="Stack by"
            value={sampleChartOptions[0].value}
          />
        </HeaderSection>

        <HistogramSignals />
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel>
        <HeaderSection title="Signals">
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

  const [itemsTotalState] = useState<number>(sampleTableData.length);
  const [pageState, setPageState] = useState<PageTypes>({ index: 0, size: 20 });
  // const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
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

export const RuleDetailsComponent = React.memo(() => {
  const [popoverState, setPopoverState] = useState(false);

  return (
    <>
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) => {
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>

              <WrapperPage>
                <HeaderPage
                  backOptions={{ href: '#detection-engine/rules', text: 'Back to rules' }}
                  badgeOptions={{ text: 'Experimental' }}
                  border
                  subtitle={[
                    'Created by: mmarcialis on 12/28/2019, 12:00 PM',
                    'Updated by: agoldstein on 12/28/2019, 12:00 PM',
                  ]}
                  subtitle2={[
                    'Last signal: 23 minutes ago',
                    <ProgressInline current={95000} max={105000} unit="events">
                      {'Status: Running'}
                    </ProgressInline>,
                  ]}
                  title="Automated exfiltration"
                >
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSwitch checked={true} label="Activate rule" onChange={() => {}} />
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            href="#detection-engine/rules/rule-details/edit-rule"
                            iconType="visControls"
                          >
                            {'Edit rule settings'}
                          </EuiButton>
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EuiPopover
                            button={
                              <EuiButtonIcon
                                aria-label="Additional actions"
                                iconType="boxesHorizontal"
                                onClick={() => setPopoverState(!popoverState)}
                              />
                            }
                            closePopover={() => setPopoverState(false)}
                            isOpen={popoverState}
                          >
                            <p>{'Overflow context menu here.'}</p>
                          </EuiPopover>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </HeaderPage>

                <EuiCallOut
                  color="danger"
                  iconType="alert"
                  size="s"
                  title="Rule failed to run on 12/28/2019, 12:00 PM"
                >
                  <p>{'Full fail message here.'}</p>
                </EuiCallOut>

                <EuiSpacer />

                <EuiFlexGroup>
                  <EuiFlexItem component="section" grow={1}>
                    <EuiPanel>
                      <HeaderSection title="Definition" />
                    </EuiPanel>
                  </EuiFlexItem>

                  <EuiFlexItem component="section" grow={2}>
                    <EuiPanel>
                      <HeaderSection title="About" />

                      {/* <p>{'Description'}</p> */}

                      {/* <EuiFlexGrid columns={2}>
                      <EuiFlexItem style={{ flex: '0 0 calc(100% - 24px)' }}>
                        <p>{'Description'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Severity'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Risk score boost'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'References'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'False positives'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Mitre ATT&CK types'}</p>
                      </EuiFlexItem>

                      <EuiFlexItem>
                        <p>{'Tags'}</p>
                      </EuiFlexItem>
                    </EuiFlexGrid> */}
                    </EuiPanel>
                  </EuiFlexItem>

                  <EuiFlexItem component="section" grow={1}>
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
              </WrapperPage>
            </StickyContainer>
          ) : (
            <WrapperPage>
              <HeaderPage border title={i18n.PAGE_TITLE} />

              <DetectionEngineEmptyPage />
            </WrapperPage>
          );
        }}
      </WithSource>

      <SpyRoute />
    </>
  );
});
RuleDetailsComponent.displayName = 'RuleDetailsComponent';
