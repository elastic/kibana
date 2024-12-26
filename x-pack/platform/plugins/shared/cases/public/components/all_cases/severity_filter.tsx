/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import React from 'react';
import type { CaseSeverity } from '../../../common/types/domain';
import { severities } from '../severity/config';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter, mapToMultiSelectOption } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  selectedOptionKeys: CaseSeverity[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
}

const options = mapToMultiSelectOption(Object.keys(severities) as CaseSeverity[]);

export const SeverityFilter: React.FC<Props> = ({ selectedOptionKeys, onChange }) => {
  const renderOption = (option: MultiSelectFilterOption<CaseSeverity>) => {
    const severityData = severities[option.label];
    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={severityData.color}>{severityData.label}</EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <MultiSelectFilter<CaseSeverity>
      buttonLabel={i18n.SEVERITY}
      id={'severity'}
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={selectedOptionKeys}
      isLoading={false}
    />
  );
};
SeverityFilter.displayName = 'SeverityFilter';
