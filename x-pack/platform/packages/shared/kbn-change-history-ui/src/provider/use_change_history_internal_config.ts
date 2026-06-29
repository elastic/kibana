/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { ChangeHistoryInternalConfigContext } from './change_history_internal_config_context';

export const useChangeHistoryInternalConfig = () => {
  const context = useContext(ChangeHistoryInternalConfigContext);

  if (!context) {
    throw new Error('useChangeHistoryInternalConfig must be used within ChangeHistoryProvider');
  }

  return context;
};
