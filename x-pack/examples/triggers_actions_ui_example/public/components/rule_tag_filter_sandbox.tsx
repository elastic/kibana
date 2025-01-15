/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const RuleTagFilterSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return (
    <div style={{ flex: 1 }}>
      {triggersActionsUi.getRuleTagFilter({
        canLoadRules: true,
        selectedTags,
        onChange: setSelectedTags,
      })}
      <EuiSpacer />
      <div>selected tags: {JSON.stringify(selectedTags)}</div>
    </div>
  );
};
