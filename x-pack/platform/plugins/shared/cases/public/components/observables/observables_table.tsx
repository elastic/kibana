/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';

import { EuiInMemoryTable, EuiSkeletonText, EuiSpacer, EuiEmptyPrompt } from '@elastic/eui';

import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type { Observable, ObservableType } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui';
import * as i18n from './translations';
import { AddObservable } from './add_observable';
import { ObservableActionsPopoverButton } from './observable_actions_popover_button';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { ObservablesUtilityBar } from './observables_utility_bar';

const getColumns = (
  caseData: CaseUI,
  observableTypes: ObservableType[]
): Array<EuiBasicTableColumn<Observable>> => [
  {
    name: i18n.OBSERVABLE_VALUE,
    field: 'value',
    'data-test-subj': 'cases-observables-table-value',
  },
  {
    name: i18n.OBSERVABLE_TYPE,
    field: 'typeKey',
    'data-test-subj': 'cases-observables-table-type',
    render: (typeKey: string) =>
      observableTypes.find((observableType) => observableType.key === typeKey)?.label || '-',
  },
  {
    name: i18n.OBSERVABLE_DESCRIPTION,
    field: 'description',
    'data-test-subj': 'cases-observables-table-description',
  },
  {
    name: i18n.DATE_ADDED,
    field: 'createdAt',
    'data-test-subj': 'cases-observables-table-date-added',
    dataType: 'date',
  },
  {
    name: i18n.OBSERVABLE_ACTIONS,
    field: 'actions',
    'data-test-subj': 'cases-observables-table-actions',
    width: '120px',
    actions: [
      {
        name: i18n.OBSERVABLE_ACTIONS,
        render: (observable: Observable) => {
          return <ObservableActionsPopoverButton caseData={caseData} observable={observable} />;
        },
      },
    ],
  },
];

const EmptyObservablesTable = ({ caseData }: { caseData: CaseUI }) => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_OBSERVABLES}</h3>}
    data-test-subj="cases-observables-table-empty"
    titleSize="xs"
    actions={<AddObservable caseData={caseData} />}
  />
);

EmptyObservablesTable.displayName = 'EmptyObservablesTable';

export interface ObservablesTableProps {
  caseData: CaseUI;
  isLoading: boolean;
  onExtractObservablesChanged: (isOn: boolean) => void;
}

export const ObservablesTable = ({
  caseData,
  isLoading,
  onExtractObservablesChanged,
}: ObservablesTableProps) => {
  const filesTableRowProps = useCallback(
    (observable: Observable) => ({
      'data-test-subj': `cases-observables-table-row-${observable.id}`,
    }),
    []
  );

  const { data: currentConfiguration, isLoading: loadingCaseConfigure } = useGetCaseConfiguration();

  const observableTypes = useMemo(
    () => [...OBSERVABLE_TYPES_BUILTIN, ...currentConfiguration.observableTypes],
    [currentConfiguration.observableTypes]
  );
  const columns = useMemo(() => getColumns(caseData, observableTypes), [caseData, observableTypes]);

  return isLoading || loadingCaseConfigure ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText data-test-subj="cases-observables-table-loading" lines={10} />
    </>
  ) : (
    <>
      <ObservablesUtilityBar
        caseData={caseData}
        isLoading={isLoading}
        onExtractObservablesChanged={onExtractObservablesChanged}
      />
      <EuiSpacer size="xs" />
      <EuiInMemoryTable
        tableCaption={i18n.OBSERVABLES_TABLE}
        items={caseData.observables}
        rowHeader="id"
        columns={columns}
        data-test-subj="cases-observables-table"
        noItemsMessage={<EmptyObservablesTable caseData={caseData} />}
        rowProps={filesTableRowProps}
      />
    </>
  );
};

ObservablesTable.displayName = 'ObservablesTable';
