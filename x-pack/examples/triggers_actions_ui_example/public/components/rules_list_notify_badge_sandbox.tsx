/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  TriggersAndActionsUIPublicPluginStart,
  RuleTableItem,
} from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

const mockRule: RuleTableItem = {
  id: '1',
  enabled: true,
  name: 'test rule',
  tags: ['tag1'],
  ruleTypeId: 'test_rule_type',
  consumer: 'rules',
  schedule: { interval: '5d' },
  actions: [
    { id: 'test', actionTypeId: 'the_connector', group: 'rule', params: { message: 'test' } },
  ],
  params: { name: 'test rule type name' },
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  apiKeyOwner: null,
  throttle: '1m',
  notifyWhen: 'onActiveAlert',
  muteAll: true,
  mutedInstanceIds: [],
  executionStatus: {
    status: 'active',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  actionsCount: 1,
  index: 0,
  ruleType: 'Test Rule Type',
  isEditable: true,
  enabledInLicense: true,
};

export const RulesListNotifyBadgeSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <div style={{ flex: 1 }}>
      {triggersActionsUi.getRulesListNotifyBadge({
        rule: mockRule,
        isOpen,
        isLoading,
        onClick: () => setIsOpen(!isOpen),
        onClose: () => setIsOpen(false),
        onLoading: setIsLoading,
        onRuleChanged: () => Promise.resolve(),
        snoozeRule: () => Promise.resolve(),
        unsnoozeRule: () => Promise.resolve(),
      })}
    </div>
  );
};
