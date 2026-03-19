/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFormRow, EuiIcon, EuiSuperSelect } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';

import { SOLUTION_VIEW_CONFIG } from '../../constants';
import type { SupportedSolutionView } from '../../types';

interface SolutionSelectorProps {
  selectedSolution: SupportedSolutionView;
  onSolutionChange: (solution: SupportedSolutionView) => void;
}

const options: EuiSuperSelectOption<SupportedSolutionView>[] = (
  Object.entries(SOLUTION_VIEW_CONFIG) as [SupportedSolutionView, { name: string; icon: string }][]
).map(([key, config]) => ({
  value: key,
  inputDisplay: (
    <>
      <EuiIcon type={config.icon} aria-hidden={true} /> {config.name}
    </>
  ),
}));

export const SolutionSelector = ({ selectedSolution, onSolutionChange }: SolutionSelectorProps) => {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.spaces.solutionViewSwitch.modal.solutionLabel', {
        defaultMessage: 'Switch to solution view',
      })}
      fullWidth
    >
      <EuiSuperSelect
        options={options}
        valueOfSelected={selectedSolution}
        onChange={onSolutionChange}
        data-test-subj="solutionViewSwitchSelect"
        fullWidth
      />
    </EuiFormRow>
  );
};
