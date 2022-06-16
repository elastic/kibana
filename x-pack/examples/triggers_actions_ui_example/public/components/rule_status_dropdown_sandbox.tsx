/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const RuleStatusDropdownSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const [enabled, setEnabled] = useState(true);
  const [isSnoozedUntil, setIsSnoozedUntil] = useState<Date | null>(null);
  const [muteAll, setMuteAll] = useState(false);

  return triggersActionsUi.getRuleStatusDropdown({
    rule: {
      enabled,
      isSnoozedUntil,
      muteAll,
    },
    enableRule: async () => {
      setEnabled(true);
      setMuteAll(false);
      setIsSnoozedUntil(null);
    },
    disableRule: async () => setEnabled(false),
    snoozeRule: async (time) => {
      if (time === -1) {
        setIsSnoozedUntil(null);
        setMuteAll(true);
      } else {
        setIsSnoozedUntil(new Date(time));
        setMuteAll(false);
      }
    },
    unsnoozeRule: async () => {
      setMuteAll(false);
      setIsSnoozedUntil(null);
    },
    onRuleChanged: () => {},
    isEditable: true,
  });
};
