/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterButton } from '@elastic/eui';
import type { CaseSource } from '../../../../common/types/domain';
import * as i18n from '../../../common/translations';

interface Props {
  selectedOptionKeys?: CaseSource[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
}

/** A toggle: on lists only cases opened from AlertZero. */
const SourceFilterComponent: React.FC<Props> = ({ selectedOptionKeys = [], onChange }) => {
  const isSelected = selectedOptionKeys.includes('alertzero');
  return (
    <EuiFilterButton
      isToggle
      isSelected={isSelected}
      hasActiveFilters={isSelected}
      onClick={() =>
        onChange({ filterId: 'source', selectedOptionKeys: isSelected ? [] : ['alertzero'] })
      }
      data-test-subj="options-filter-popover-button-source"
    >
      {i18n.FILTER_FROM_ALERTZERO}
    </EuiFilterButton>
  );
};

SourceFilterComponent.displayName = 'SourceFilterComponent';

export const SourceFilter = React.memo(SourceFilterComponent);
