/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleSnoozeSettings } from '@kbn/triggers-actions-ui-plugin/public/types';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

const mockSnoozeSettings: RuleSnoozeSettings = {
  muteAll: true,
  name: '',
};

export const RulesListNotifyBadgeSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const RulesListNotifyBadge = triggersActionsUi.getRulesListNotifyBadge;
  return (
    <div style={{ flex: 1 }}>
      <RulesListNotifyBadge
        ruleId="1"
        snoozeSettings={mockSnoozeSettings}
        onRuleChanged={() => Promise.resolve()}
      />
    </div>
  );
};
