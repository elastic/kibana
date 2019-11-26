/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ActionType, ActionTableItem } from '../../types';
export const ActionsContext = React.createContext({} as IActionContext);

export interface IActionContext {
  addFlyoutVisible: boolean;
  editFlyoutVisible: boolean;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  actionTypesIndex: Record<string, ActionType> | undefined;
  loadActions: () => Promise<void>;
  editedActionItem: ActionTableItem | undefined;
}
