/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTabbedContent,
  EuiTextColor,
} from '@elastic/eui';
import moment from 'moment';
import React, { useState } from 'react';
import styled, { css } from 'styled-components';

import { getEmptyTagValue } from '../../../components/empty_value';
import { HeaderPage } from '../../../components/header_page';
import { HeaderSection } from '../../../components/header_section';
import { LinkIcon } from '../../../components/link_icon';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../components/utility_bar';
import { SpyRoute } from '../../../utils/route/spy_routes';
import * as i18n from './translations';

// Will need to change this to get the current datetime format from Kibana settings.
const dateTimeFormat = (value: string) => {
  return moment(value).format('M/D/YYYY, h:mm A');
};

const AllRules = React.memo(() => {
  interface ColumnTypes {
    id: number;
    rule: string;
    method: string;
    severity: string;
    lastCompletedRun: string;
    lastResponse: string;
    tags: string;
    activate: boolean;
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
      name: 'Edit rule settings',
      description: 'Edit rule settings',
      icon: 'visControls',
      onClick: () => {},
    },
    {
      name: 'Run rule manually…',
      description: 'Run rule manually…',
      icon: 'play',
      onClick: () => {},
    },
    {
      name: 'Duplicate rule…',
      description: 'Duplicate rule…',
      icon: 'copy',
      onClick: () => {},
    },
    {
      name: 'Export rule',
      description: 'Export rule',
      icon: 'export',
      onClick: () => {},
    },
    {
      name: 'Delete rule…',
      description: 'Delete rule…',
      icon: 'trash',
      onClick: () => {},
    },
  ];

  const columns = [
    {
      field: 'rule',
      name: 'Rule',
      render: (value: string) => (
        <EuiLink href="#/detection-engine/rules/rule-details">{value}</EuiLink>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'method',
      name: 'Method',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'severity',
      name: 'Severity',
      render: (value: string) => <EuiHealth color="warning">{value}</EuiHealth>,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lastCompletedRun',
      name: 'Last completed run',
      render: (value: string) => <time dateTime={value}>{dateTimeFormat(value)}</time>,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lastResponse',
      name: 'Last response',
      render: (value: string | undefined) => {
        return value === undefined ? (
          getEmptyTagValue()
        ) : (
          <>
            {value === 'Fail' ? (
              <EuiTextColor color="danger">
                {value} <EuiIconTip content="Full fail message here." size="s" type="iInCircle" />
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
      field: 'tags',
      name: 'Tags',
      render: (value: string) => <EuiBadge color="hollow">{value}</EuiBadge>,
      sortable: true,
      truncateText: true,
    },
    {
      align: 'center',
      field: 'activate',
      name: 'Activate',
      render: (value: boolean) => <EuiSwitch checked={value} />,
      sortable: true,
    },
    {
      actions,
    },
  ];

  const sampleTableData = [
    {
      id: 1,
      rule: 'Automated exfiltration',
      method: 'Custom query',
      severity: 'Medium',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: 'Success',
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 2,
      rule: 'Automated exfiltration',
      method: 'Custom query',
      severity: 'Medium',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: 'Fail',
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 3,
      rule: 'Automated exfiltration',
      method: 'Custom query',
      severity: 'Medium',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: 'Success',
      tags: 'attack.t1234',
      activate: false,
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
        <HeaderSection split title="All rules">
          <EuiFieldSearch aria-label="Search rules" fullWidth placeholder="e.g. rule name" />
        </HeaderSection>

        <UtilityBar border>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>{'Showing: 39 rules'}</UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarText>{'Selected: 2 rules'}</UtilityBarText>

              <UtilityBarAction
                iconSide="right"
                iconType="arrowDown"
                popoverContent={<p>{'Batch actions context menu here.'}</p>}
              >
                {'Batch actions'}
              </UtilityBarAction>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>

        <EuiBasicTable
          columns={columns}
          compressed
          // hasActions={false}
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
            selectable: () => true,
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
AllRules.displayName = 'AllRules';

const ActivityMonitor = React.memo(() => {
  interface ColumnTypes {
    id: number;
    rule: string;
    ran: string;
    lookedBackTo: string;
    status: string;
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
      render: (item: ColumnTypes) => {
        if (item.status === 'Running') {
          return <LinkIcon iconType="stop">{'Stop'}</LinkIcon>;
        } else if (item.status === 'Stopped') {
          return <LinkIcon iconType="play">{'Resume'}</LinkIcon>;
        } else {
          return <>{''}</>;
        }
      },
    },
  ];

  const columns = [
    {
      field: 'rule',
      name: 'Rule',
      render: (value: string) => (
        <EuiLink href="#/detection-engine/rules/rule-details">{value}</EuiLink>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'ran',
      name: 'Ran',
      render: (value: string) => <time dateTime={value}>{dateTimeFormat(value)}</time>,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lookedBackTo',
      name: 'Looked back to',
      render: (value: string) => <time dateTime={value}>{dateTimeFormat(value)}</time>,
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
      render: (value: string | undefined) => {
        return value === undefined ? (
          getEmptyTagValue()
        ) : (
          <>
            {value === 'Fail' ? (
              <EuiTextColor color="danger">
                {value} <EuiIconTip content="Full fail message here." size="s" type="iInCircle" />
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
      width: '70px',
    },
  ];

  const sampleTableData = [
    {
      id: 1,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Running',
    },
    {
      id: 2,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Stopped',
    },
    {
      id: 3,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Fail',
    },
    {
      id: 4,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 5,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 6,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 7,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 8,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 9,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 10,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 11,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 12,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 13,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 14,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 15,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 16,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 17,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 18,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 19,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 20,
      rule: 'Automated exfiltration',
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Completed',
      response: 'Success',
    },
    {
      id: 21,
      rule: 'Automated exfiltration',
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
          compressed
          hasActions={false}
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

export const RulesComponent = React.memo(() => {
  return (
    <>
      <HeaderPage
        backOptions={{ href: '#detection-engine', text: 'Back to detection engine' }}
        subtitle="Last completed run: 23 minutes ago"
        title={i18n.PAGE_TITLE}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
          <EuiFlexItem grow={false}>
            <EuiButton href="#" iconType="importAction">
              {'Import rule…'}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton fill href="#/detection-engine/rules/create-rule" iconType="plusInCircle">
              {'Add new rule'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderPage>

      <EuiTabbedContent
        tabs={[
          {
            id: 'tabAllRules',
            name: 'All rules',
            content: <AllRules />,
          },
          {
            id: 'tabActivityMonitor',
            name: 'Activity monitor',
            content: <ActivityMonitor />,
          },
        ]}
      />

      <SpyRoute />
    </>
  );
});
RulesComponent.displayName = 'RulesComponent';
