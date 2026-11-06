/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { useActionRunner } from '../workflows/use_action_runner';
import { useWorkflowsGate } from '../workflows/use_workflows_gate';
import { DroppedActions } from './dropped_actions';

/**
 * What a person presses to make something happen. It looks the same everywhere, and says why when
 * it cannot be pressed: a button that runs a workflow needs the privilege to, and the reason is
 * shown as the tooltip of the button and not left for the person to guess.
 */
export const ButtonNode = ({ node }: { node: AppNodeOfType<'button'> }) => {
  const run = useActionRunner(node.id);
  const [dropped, setDropped] = useState<string[]>([]);

  const unavailableReason = useWorkflowsGate(node.onClick);

  return (
    <div data-node-id={node.id}>
      <EuiToolTip content={unavailableReason}>
        <EuiButton
          fill
          isDisabled={unavailableReason !== undefined}
          onClick={() => setDropped(run(node.onClick))}
          data-test-subj="customAppButton"
        >
          {node.label}
        </EuiButton>
      </EuiToolTip>
      <DroppedActions reasons={dropped} onDismiss={() => setDropped([])} />
    </div>
  );
};
