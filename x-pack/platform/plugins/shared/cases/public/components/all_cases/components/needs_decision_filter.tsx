/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterButton } from '@elastic/eui';
import * as i18n from '../../../common/translations';

interface Props {
  selectedOptionKeys?: string[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
}

/** A toggle: on lists only cases with a proposal still awaiting a decision. */
const NeedsDecisionFilterComponent: React.FC<Props> = ({ selectedOptionKeys = [], onChange }) => {
  const isSelected = selectedOptionKeys.includes('true');
  return (
    <EuiFilterButton
      isToggle
      isSelected={isSelected}
      hasActiveFilters={isSelected}
      onClick={() =>
        onChange({ filterId: 'needsDecision', selectedOptionKeys: isSelected ? [] : ['true'] })
      }
      data-test-subj="options-filter-popover-button-needsDecision"
    >
      {i18n.FILTER_NEEDS_DECISION}
    </EuiFilterButton>
  );
};

NeedsDecisionFilterComponent.displayName = 'NeedsDecisionFilterComponent';

export const NeedsDecisionFilter = React.memo(NeedsDecisionFilterComponent);
