/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useExpandableContextMenuPanel } from '../contexts/expandable_context_menu_panel_context';
import { ADD_TO_CASE, CASE_TYPE } from '../translations';
import type { AddToCaseAction } from './add_to_case_action_panel';
import { AddToCaseActionPanel } from './add_to_case_action_panel';

interface AddToCaseContextMenuItemProps {
  actions: AddToCaseAction[];
  dataTestSubj?: string;
}

export const AddToCaseContextMenuItem = ({
  actions,
  dataTestSubj = 'add-to-case-action',
}: AddToCaseContextMenuItemProps) => {
  const { openPanel } = useExpandableContextMenuPanel() ?? {};
  const onClick = useCallback(() => {
    openPanel?.(<AddToCaseActionPanel actions={actions} />, CASE_TYPE);
  }, [actions, openPanel]);

  if (!openPanel) {
    return null;
  }

  return (
    <EuiContextMenuItem data-test-subj={dataTestSubj} hasPanel icon="briefcase" onClick={onClick}>
      {ADD_TO_CASE}
    </EuiContextMenuItem>
  );
};
