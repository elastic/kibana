/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { ADD_TO_CASE, CASE_TYPE } from '../translations';

export interface AddToCaseAction {
  id: string;
  label: string;
  onClick: () => void;
  dataTestSubj?: string;
  disabled?: boolean;
}

type AddToCaseOption = EuiSelectableOption<{ action: AddToCaseAction }>;

interface AddToCaseActionPanelProps {
  actions: AddToCaseAction[];
}

export const AddToCaseActionPanel = ({ actions }: AddToCaseActionPanelProps) => {
  const [selectedActionId, setSelectedActionId] = useState<string>();
  const selectedAction = actions.find(({ id }) => id === selectedActionId);
  const options = useMemo<AddToCaseOption[]>(
    () =>
      actions.map((action) => ({
        action,
        'data-test-subj': action.dataTestSubj,
        checked: action.id === selectedAction?.id ? 'on' : undefined,
        disabled: action.disabled,
        key: action.id,
        label: action.label,
      })),
    [actions, selectedAction?.id]
  );
  const onChange = useCallback((newOptions: AddToCaseOption[]) => {
    const newSelectedActionId = newOptions.find(({ checked }) => checked === 'on')?.key;
    if (newSelectedActionId) {
      setSelectedActionId(newSelectedActionId);
    }
  }, []);

  return (
    <>
      <EuiSelectable<{ action: AddToCaseAction }>
        aria-label={CASE_TYPE}
        options={options}
        onChange={onChange}
        singleSelection="always"
      >
        {(list) => list}
      </EuiSelectable>
      <EuiButton
        fullWidth
        size="s"
        disabled={!selectedAction || selectedAction.disabled}
        onClick={selectedAction?.onClick}
        data-test-subj="add-to-case-submit"
      >
        {ADD_TO_CASE}
      </EuiButton>
    </>
  );
};
