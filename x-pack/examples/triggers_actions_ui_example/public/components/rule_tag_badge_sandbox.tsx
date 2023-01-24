/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Note: This exists only temporarily as we refactor to remove the sandboxes
 * to its own plugin. Ideally we do not want to use an internal page within
 * the triggers_actions_ui plugin
 */

import React, { useState } from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

const tags = ['tag1', 'tag2', 'tag3', 'tag4'];

export const RuleTagBadgeSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div style={{ flex: 1 }}>
      {triggersActionsUi.getRuleTagBadge({
        isOpen,
        tags,
        onClick: () => setIsOpen(true),
        onClose: () => setIsOpen(false),
      })}
    </div>
  );
};
