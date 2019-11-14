/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiLoadingContent,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';

import { HeaderSection } from '../../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';
import { getColumns } from './columns';
import { useRules } from '../../../../containers/detection_engine/rules/use_rules';
import { Rule } from '../../../../containers/detection_engine/rules/types';
import { Loader } from '../../../../components/loader';
import { Panel } from '../../../../components/panel';
import { getBatchItems } from './batch_actions';

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
  sourceRule: Rule;
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
      sourceRule: rule,
    }));

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(true);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'rule', direction: 'asc' });
  const [isLoadingRules, rules, setRules, updatePagination] = useRules(refreshToggle);

  const updateRule = useCallback(
    (isEnabled: boolean, ruleId: string) => {
      console.log('Update Rule');
      console.log('isEnabled', isEnabled);
      console.log('ruleId', ruleId);
      const data = rules.data.map<Rule>(r => {
        console.log(r.id === ruleId);
        return r.id === ruleId ? { ...r, enabled: isEnabled } : r;
      });
      console.log('Setting rules', { ...rules, data });
      setRules({ ...rules, data });
    },
    [rules]
  );

  const refreshRules = useCallback(() => {
    setRefreshToggle(!refreshToggle);
  }, [refreshToggle]);

  useEffect(() => {
    setIsLoading(isLoadingRules);

    if (!isLoadingRules) {
      setIsInitialLoad(false);
    }
  }, [isLoadingRules]);

  console.log('Rending AllRules Table');
  return (
    <>
      <EuiSpacer />

      <Panel loading={isLoading}>
        {isInitialLoad ? (
          <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
        ) : (
          <>
            <HeaderSection split title="All rules">
              <EuiFieldSearch aria-label="Search rules" fullWidth placeholder="e.g. rule name" />
            </HeaderSection>

            <UtilityBar border>
              <UtilityBarSection>
                <UtilityBarGroup>
                  <UtilityBarText>{`Showing: ${rules.total} rules`}</UtilityBarText>
                </UtilityBarGroup>

                <UtilityBarGroup>
                  <UtilityBarText>{`Selected: ${selectedState.length} rules`}</UtilityBarText>
                  <UtilityBarAction
                    iconSide="right"
                    iconType="arrowDown"
                    popoverContent={<EuiContextMenuPanel items={getBatchItems(selectedState)} />}
                  >
                    {'Batch actions'}
                  </UtilityBarAction>
                  <UtilityBarAction iconSide="right" iconType="refresh" onClick={refreshRules}>
                    {'Refresh'}
                  </UtilityBarAction>
                </UtilityBarGroup>

                {/* <UtilityBarGroup>*/}
                {/*  <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>*/}
                {/* </UtilityBarGroup>*/}
              </UtilityBarSection>
            </UtilityBar>

            <EuiBasicTable
              columns={getColumns(updateRule)}
              isSelectable
              itemId="id"
              items={formatRules(rules.data)}
              onChange={({
                page,
                sort,
              }: {
                page: {
                  index: number;
                  size: number;
                };
                sort: SortTypes;
              }) => {
                console.log('Updating sort/pagination');
                const sortField = sort.field === 'rule' ? 'name' : 'enabled';
                updatePagination({ page: page.index + 1, perPage: page.size, sortField });
                setSortState(sort);
              }}
              pagination={{
                pageIndex: rules.page - 1,
                pageSize: rules.perPage,
                totalItemCount: rules.total,
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
            {isLoading && <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />}
          </>
        )}
      </Panel>
    </>
  );
});
AllRules.displayName = 'AllRules';
