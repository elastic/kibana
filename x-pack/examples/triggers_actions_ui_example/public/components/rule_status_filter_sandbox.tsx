/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  TriggersAndActionsUIPublicPluginStart,
  RuleStatusFilterProps,
} from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const RuleStatusFilterSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const [selectedStatuses, setSelectedStatuses] = useState<
    RuleStatusFilterProps['selectedStatuses']
  >([]);

  return (
    <div style={{ flex: 1 }}>
      {triggersActionsUi.getRuleStatusFilter({
        selectedStatuses,
        onChange: setSelectedStatuses,
      })}
      <div>Selected states: {JSON.stringify(selectedStatuses)}</div>
    </div>
  );
};
