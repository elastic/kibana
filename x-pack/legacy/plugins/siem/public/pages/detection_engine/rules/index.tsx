/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
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

import { getEmptyTagValue } from '../../../components/empty_value';
import { HeaderPage } from '../../../components/header_page';
import { HeaderSection } from '../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../components/detection_engine/utility_bar';
import { WrapperPage } from '../../../components/wrapper_page';
import { SpyRoute } from '../../../utils/route/spy_routes';
import * as i18n from './translations';

// Michael: Will need to change this to get the current datetime format from Kibana settings.
const dateTimeFormat = (value: string) => {
  return moment(value).format('M/D/YYYY, h:mm A');
};

const AllRules = React.memo(() => {
  interface RuleTypes {
    href: string;
    name: string;
    status: string;
  }

  interface LastResponseTypes {
    type: string;
    message?: string;
  }

  interface ColumnTypes {
    id: number;
    rule: RuleTypes;
    method: string;
    severity: string;
    lastCompletedRun: string;
    lastResponse: LastResponseTypes;
    tags: string | string[];
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
      description: 'Edit rule settings',
      icon: 'visControls',
      name: 'Edit rule settings',
      onClick: () => {},
    },
    {
      description: 'Run rule manually…',
      icon: 'play',
      name: 'Run rule manually…',
      onClick: () => {},
    },
    {
      description: 'Duplicate rule…',
      icon: 'copy',
      name: 'Duplicate rule…',
      onClick: () => {},
    },
    {
      description: 'Export rule',
      icon: 'exportAction',
      name: 'Export rule',
      onClick: () => {},
    },
    {
      description: 'Delete rule…',
      icon: 'trash',
      name: 'Delete rule…',
      onClick: () => {},
    },
  ];

  // Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
  const columns = [
    {
      field: 'rule',
      name: 'Rule',
      render: (value: ColumnTypes['rule']) => (
        <div>
          <EuiLink href={value.href}>{value.name}</EuiLink>{' '}
          <EuiBadge color="hollow">{value.status}</EuiBadge>
        </div>
      ),
      sortable: true,
      truncateText: true,
      width: '24%',
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
      render: (value: ColumnTypes['severity']) => (
        <EuiHealth
          color={
            value === 'Low'
              ? euiLightVars.euiColorVis0
              : value === 'Medium'
              ? euiLightVars.euiColorVis5
              : value === 'High'
              ? euiLightVars.euiColorVis7
              : euiLightVars.euiColorVis9
          }
        >
          {value}
        </EuiHealth>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lastCompletedRun',
      name: 'Last completed run',
      render: (value: ColumnTypes['lastCompletedRun']) => {
        return value === undefined ? (
          getEmptyTagValue()
        ) : (
          <time dateTime={value}>{dateTimeFormat(value)}</time>
        );
      },
      sortable: true,
      truncateText: true,
      width: '16%',
    },
    {
      field: 'lastResponse',
      name: 'Last response',
      render: (value: ColumnTypes['lastResponse']) => {
        return value === undefined ? (
          getEmptyTagValue()
        ) : (
          <>
            {value.type === 'Fail' ? (
              <EuiTextColor color="danger">
                {value.type} <EuiIconTip content={value.message} type="iInCircle" />
              </EuiTextColor>
            ) : (
              <EuiTextColor color="secondary">{value.type}</EuiTextColor>
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
      render: (value: ColumnTypes['tags']) => (
        <div>
          {typeof value !== 'string' ? (
            <>
              {value.map((tag, i) => (
                <EuiBadge color="hollow" key={i}>
                  {tag}
                </EuiBadge>
              ))}
            </>
          ) : (
            <EuiBadge color="hollow">{value}</EuiBadge>
          )}
        </div>
      ),
      sortable: true,
      truncateText: true,
      width: '20%',
    },
    {
      align: 'center',
      field: 'activate',
      name: 'Activate',
      render: (value: ColumnTypes['activate']) => (
        <EuiSwitch checked={value} label="Activate" onChange={() => {}} showLabel={false} />
      ),
      sortable: true,
      width: '65px',
    },
    {
      actions,
      width: '40px',
    },
  ];

  const sampleTableData = [
    {
      id: 1,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Low',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: ['attack.t1234', 'attack.t4321'],
      activate: true,
    },
    {
      id: 2,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Medium',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Fail',
        message: 'Full fail message here.',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 3,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'High',
      tags: 'attack.t1234',
      activate: false,
    },
    {
      id: 4,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 5,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 6,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 7,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 8,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 9,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 10,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 11,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 12,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 13,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 14,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 15,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 16,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 17,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 18,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 19,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 20,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
    {
      id: 21,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
        status: 'Experimental',
      },
      method: 'Custom query',
      severity: 'Critical',
      lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
      lastResponse: {
        type: 'Success',
      },
      tags: 'attack.t1234',
      activate: true,
    },
  ];

  const [itemsTotalState] = useState<number>(sampleTableData.length);
  const [pageState, setPageState] = useState<PageTypes>({ index: 0, size: 20 });
  // const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'rule', direction: 'asc' });

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
AllRules.displayName = 'AllRules';

const ActivityMonitor = React.memo(() => {
  interface RuleTypes {
    href: string;
    name: string;
  }

  interface ColumnTypes {
    id: number;
    rule: RuleTypes;
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
      field: 'rule',
      name: 'Rule',
      render: (value: ColumnTypes['rule']) => <EuiLink href={value.href}>{value.name}</EuiLink>,
      sortable: true,
      truncateText: true,
    },
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
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Running',
    },
    {
      id: 2,
      rule: {
        href: '#/detection-engine/rules/rule-details',
        name: 'Automated exfiltration',
      },
      ran: '2019-12-28 00:00:00.000-05:00',
      lookedBackTo: '2019-12-28 00:00:00.000-05:00',
      status: 'Stopped',
    },
    {
      id: 3,
      rule: {
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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
        href: '#/detection-engine/rules/rule-details',
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

export const RulesComponent = React.memo(() => {
  return (
    <>
      <WrapperPage>
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
      </WrapperPage>

      <SpyRoute />
    </>
  );
});
RulesComponent.displayName = 'RulesComponent';
