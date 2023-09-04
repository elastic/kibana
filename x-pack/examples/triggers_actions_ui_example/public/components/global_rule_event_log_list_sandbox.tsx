/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const GlobalRuleEventLogListSandbox = ({ triggersActionsUi }: SandboxProps) => {
  return (
    <div style={{ height: '400px' }}>
      {triggersActionsUi.getGlobalRuleEventLogList({
        localStorageKey: 'test-local-storage-key',
        filteredRuleTypes: ['apm.error_rate', 'apm.transaction_error_rate'],
      })}
    </div>
  );
};
