/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiTab, EuiTabs, EuiEmptyPrompt } from '@elastic/eui';
import React, { useMemo, memo, useState } from 'react';
import styled from 'styled-components';

import * as i18n from '../../translations';
import { RuleStatusRowItemType } from '../../../../../pages/detection_engine/rules/all/columns';
import { Rules } from '../../../../../containers/detection_engine/rules';

// EuiBasicTable give me a hardtime with adding the ref attributes so I went the easy way
// after few hours of fight with typescript !!!! I lost :(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MyEuiBasicTable = styled(EuiBasicTable as any)`` as any;

interface AllRulesTablesProps {
  euiBasicTableSelectionProps: unknown;
  hasNoPermissions: boolean;
  monitoringColumns: unknown;
  paginationMemo: unknown;
  rules: Rules;
  rulesColumns: unknown;
  rulesStatuses: RuleStatusRowItemType[] | null;
  sorting: unknown;
  tableOnChangeCallback: unknown;
  tableRef?: unknown;
}

enum AllRulesTabs {
  rules = 'rules',
  monitoring = 'monitoring',
}

const allRulesTabs = [
  {
    id: AllRulesTabs.rules,
    name: i18n.RULES_TAB,
    disabled: false,
  },
  {
    id: AllRulesTabs.monitoring,
    name: i18n.MONITORING_TAB,
    disabled: false,
  },
];

const AllRulesTablesComponent: React.FC<AllRulesTablesProps> = ({
  euiBasicTableSelectionProps,
  hasNoPermissions,
  monitoringColumns,
  paginationMemo,
  rules,
  rulesColumns,
  rulesStatuses,
  sorting,
  tableOnChangeCallback,
  tableRef,
}) => {
  const [allRulesTab, setAllRulesTab] = useState(AllRulesTabs.rules);
  const emptyPrompt = useMemo(() => {
    return (
      <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
    );
  }, []);
  const tabs = useMemo(
    () => (
      <EuiTabs>
        {allRulesTabs.map((tab) => (
          <EuiTab
            onClick={() => setAllRulesTab(tab.id)}
            isSelected={tab.id === allRulesTab}
            disabled={tab.disabled}
            key={tab.id}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
    ),
    [allRulesTabs, allRulesTab, setAllRulesTab]
  );
  return (
    <>
      {tabs}
      {allRulesTab === AllRulesTabs.rules && (
        <MyEuiBasicTable
          data-test-subj="rules-table"
          columns={rulesColumns}
          isSelectable={!hasNoPermissions ?? false}
          itemId="id"
          items={rules ?? []}
          noItemsMessage={emptyPrompt}
          onChange={tableOnChangeCallback}
          pagination={paginationMemo}
          ref={tableRef}
          sorting={sorting}
          selection={hasNoPermissions ? undefined : euiBasicTableSelectionProps}
        />
      )}
      {allRulesTab === AllRulesTabs.monitoring && (
        <MyEuiBasicTable
          data-test-subj="monitoring-table"
          columns={monitoringColumns}
          isSelectable={!hasNoPermissions ?? false}
          itemId="id"
          items={rulesStatuses}
          noItemsMessage={emptyPrompt}
          onChange={tableOnChangeCallback}
          pagination={paginationMemo}
          sorting={sorting}
        />
      )}
    </>
  );
};

export const AllRulesTables = memo(AllRulesTablesComponent);
