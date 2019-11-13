/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiFieldSearch, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';

import { HeaderSection } from '../../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';
import { columns } from './columns';
import { useRules } from '../../../../containers/detection_engine/rules/use_rules';
import { Rule } from '../../../../containers/detection_engine/rules/types';

export interface RuleTypes {
  href: string;
  name: string;
  status: string;
}

export interface LastResponseTypes {
  type: string;
  message?: string;
}

export interface ColumnTypes {
  id: string;
  rule: RuleTypes;
  method: string;
  severity: string;
  lastCompletedRun: string;
  lastResponse: LastResponseTypes;
  tags: string | string[];
  activate: boolean;
}

export interface PageTypes {
  index: number;
  size: number;
}

export interface SortTypes {
  field: string;
  direction: string;
}

export const AllRules = React.memo(() => {
  // const sampleTableData = [
  //   {
  //     id: 1,
  //     rule: {
  //       href: '#/detection-engine/rules/rule-details',
  //       name: 'Automated exfiltration',
  //       status: 'Experimental',
  //     },
  //     method: 'Custom query',
  //     severity: 'Low',
  //     lastCompletedRun: '2019-12-28 00:00:00.000-05:00',
  //     lastResponse: {
  //       type: 'Success',
  //     },
  //     tags: ['attack.t1234', 'attack.t4321'],
  //     activate: true,
  //   },
  // ];

  const formatRules = (rules: Rule[]): ColumnTypes[] =>
    rules.map(rule => ({
      id: rule.id,
      rule: {
        href: `#/detection-engine/rules/rule-details/${rule.id}`,
        name: rule.name,
        status: 'Status Placeholder',
      },
      method: rule.alertTypeParams.type, // Map to i18n
      severity: rule.alertTypeParams.severity,
      lastCompletedRun: '--', // Frank Plumber
      lastResponse: {
        type: '--', // Frank Plumber
      },
      tags: ['Tags', 'Tags', 'Tags'], // Frank Plumber
      activate: rule.enabled,
    }));

  const [pageState, setPageState] = useState<PageTypes>({ index: 0, size: 20 });
  // const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'rule', direction: 'asc' });
  const [, rules] = useRules(true);

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
          items={formatRules(rules)}
          onChange={({ page, sort }: { page: PageTypes; sort: SortTypes }) => {
            setPageState(page);
            setSortState(sort);
          }}
          pagination={{
            pageIndex: pageState.index,
            pageSize: pageState.size,
            totalItemCount: rules.length,
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
