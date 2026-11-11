/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  ActionUiBridge,
  defineAction,
  registerAction,
  type Action,
  type ActionHandler,
  type ActionUiApi,
} from '@kbn/custom-app-registry';
import { stateKeySchema, stateValueSchema } from '@kbn/custom-app-common';

/**
 * Stands in, in tests, for the `runWorkflow` action that the Workflows plugin registers, which this
 * plugin cannot import: it is another plugin, and it is not a dependency. It has the same settings,
 * the same rules about where it may run, and hands over what it resolves in the same way, so that
 * what the app does with a workflow can be tried here. The real one has its own tests. It also
 * stands in for the dialog that asks to confirm it: a double that tests set, and read.
 */
const standIn = defineAction({
  kind: 'action',
  id: 'runWorkflow',
  version: 1,
  props: lazySchema(() =>
    z.object({
      workflow: z.string().min(1).max(200),
      inputs: z
        .record(
          z.string().min(1).max(100),
          z.union([
            stateValueSchema,
            z.object({ fromColumn: z.string().min(1).max(200) }),
            z.object({ fromState: stateKeySchema }),
          ])
        )
        .default({}),
    })
  ),
  doc: { summary: 'Runs a workflow.', whenToUse: 'In tests.', example: { type: 'runWorkflow' } },
  validate: (action, { nodeId, event, allowed, state, issue }) => {
    if (!['onClick', 'onRowClick', 'onChartClick', 'onSubmit'].includes(event)) {
      issue(
        `Node "${nodeId}" runs a workflow on ${event}; a workflow can only be run by a button, a row click, a click on a chart or a form that is submitted`
      );
    }
    Object.entries(action.inputs).forEach(([name, value]) => {
      if (typeof value !== 'object') return;
      if ('fromColumn' in value && !allowed.fromColumn) {
        issue(
          `Node "${nodeId}": the input "${name}" of the workflow takes a column, which only a row click has`
        );
      }
      if ('fromState' in value && !(value.fromState in state)) {
        issue(
          `Node "${nodeId}": the input "${name}" of the workflow takes the unknown state key "${value.fromState}"`
        );
      }
    });
  },
});

const handler: ActionHandler<{ workflow: string; inputs: Record<string, unknown> }> = (
  action,
  { input, state, drop, request }
) => {
  const inputs: Record<string, unknown> = {};
  const missing = Object.entries(action.inputs).find(([name, source]) => {
    let resolved: unknown;
    if (typeof source !== 'object' || source === null) {
      resolved = source;
    } else if ('fromColumn' in source) {
      const column = (source as { fromColumn: string }).fromColumn;
      if (!input.row || !(column in input.row)) {
        drop(`Column "${column}" is not in the row`);
        return true;
      }
      resolved = input.row[column];
    } else {
      resolved = state[(source as { fromState: string }).fromState];
    }
    const isPlain = (value: unknown) =>
      value === null || ['string', 'boolean', 'number'].includes(typeof value);
    if (!isPlain(resolved) && !(Array.isArray(resolved) && resolved.every(isPlain))) {
      drop(`The input "${name}" of "${action.workflow}" is not a plain value`);
      return true;
    }
    inputs[name] = resolved;
    return false;
  });
  if (!missing) request({ workflow: action.workflow, inputs });
};

/** What the tests set, and read, in place of the real dialog and the Workflows API. */
export const mockWorkflowRunner: {
  availability: { canRun: true } | { canRun: false; reason: string };
  statuses: Record<string, 'found' | 'missing' | 'unknown'>;
  track: jest.Mock;
  request: jest.Mock;
} = { availability: { canRun: true }, statuses: {}, track: jest.fn(), request: jest.fn() };

const ids = (actions: readonly Action[]): string[] =>
  actions.flatMap((action) => {
    const { workflow } = action as { workflow?: string };
    return typeof workflow === 'string' ? [workflow] : [];
  });

const api: ActionUiApi = {
  request: (payloads, nodeId) => mockWorkflowRunner.request(payloads, nodeId),
  watch: (actions) => {
    if (mockWorkflowRunner.availability.canRun) mockWorkflowRunner.track(ids(actions));
  },
  gate: (actions) => {
    const { availability, statuses } = mockWorkflowRunner;
    if (!availability.canRun) return availability.reason;
    const missing = ids(actions).find((id) => id !== '' && statuses[id] === 'missing');
    return missing === undefined
      ? undefined
      : `The workflow "${missing}" has not been saved yet. Save it in the Workflows application and this will work.`;
  },
};

const StandInUi = ({ children }: { host: unknown; children: ReactNode }) => (
  <ActionUiBridge actionId="runWorkflow" api={api}>
    {children}
  </ActionUiBridge>
);

export const registerRunWorkflowStandIn = (): void =>
  registerAction(standIn, handler as ActionHandler, StandInUi);
