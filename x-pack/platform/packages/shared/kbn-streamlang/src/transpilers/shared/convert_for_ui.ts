/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import type { StreamlangStepWithUIAttributes, StreamlangUIBranch } from '../../../types/ui';
import {
  isConditionBlock,
  type StreamlangDSL,
  type StreamlangStep,
} from '../../../types/streamlang';

const createId = htmlIdGenerator();

export const convertStepsForUI = (dsl: StreamlangDSL): StreamlangStepWithUIAttributes[] => {
  const result: StreamlangStepWithUIAttributes[] = [];

  function unnestSteps(
    steps: StreamlangStep[],
    parentId: string | null = null,
    branch: StreamlangUIBranch = 'if'
  ) {
    for (const step of steps) {
      const stepWithUI = convertStepToUIDefinition(step, { parentId, branch });

      // If this is a Where block with nested steps, unnest them.
      // Remove the steps property, as these will now become flattened items.
      if (isConditionBlock(step) && Array.isArray(step.condition.steps)) {
        // Add the where block itself
        result.push(stepWithUI);
        // Recursively unnest if-branch children
        unnestSteps(step.condition.steps, stepWithUI.customIdentifier, 'if');
        // Recursively unnest else-branch children
        if (step.condition.else?.length) {
          unnestSteps(step.condition.else, stepWithUI.customIdentifier, 'else');
        }
      } else {
        // Add non-where steps
        result.push(stepWithUI);
      }
    }
  }

  unnestSteps(dsl.steps);

  return result;
};

export const convertStepToUIDefinition = <TStepDefinition extends StreamlangStep>(
  step: TStepDefinition,
  options: { parentId: StreamlangStepWithUIAttributes['parentId']; branch?: StreamlangUIBranch }
): StreamlangStepWithUIAttributes => {
  const id = step.customIdentifier ?? createId();
  const branch = options.branch ?? 'if';

  // If this is a where step, remove condition.steps and condition.else.
  // UI versions of the steps keep a flat array and work off parentId to represent hierarchy.
  if (isConditionBlock(step) && Array.isArray(step.condition.steps)) {
    const { steps, else: _elseSteps, ...conditionWithoutSteps } = step.condition;
    return {
      customIdentifier: id,
      parentId: options.parentId,
      branch,
      ...step,
      condition: conditionWithoutSteps,
    };
  }
  return {
    customIdentifier: id,
    parentId: options.parentId,
    branch,
    ...step,
  };
};

type StreamlangStepWithUIProps = StreamlangStep & {
  parentId: string | null;
  branch?: StreamlangUIBranch;
};
export const convertUIStepsToDSL = (
  steps: StreamlangStepWithUIAttributes[],
  stripCustomIdentifiers: boolean = true
): StreamlangDSL => {
  const idToStep: Record<string, StreamlangStepWithUIProps> = {};
  const rootSteps: Array<StreamlangStepWithUIProps> = [];

  // Prepare all steps and ensure where.steps/else exists for where blocks
  for (const step of steps) {
    const { customIdentifier, parentId, branch, ...rest } = step;
    const stepObj: Omit<StreamlangStepWithUIAttributes, 'parentId' | 'branch'> = {
      ...rest,
      customIdentifier,
    };
    // Where block
    if (isConditionBlock(stepObj)) {
      // Initialize with empty steps/else arrays for child assignment; empty else is pruned in stripUIProperties
      stepObj.condition = { ...stepObj.condition, steps: [], else: [] };
      idToStep[customIdentifier] = {
        ...stepObj,
        parentId,
        branch,
      } as StreamlangStepWithUIProps;
    } else {
      idToStep[customIdentifier] = {
        ...stepObj,
        parentId,
        branch,
      } as StreamlangStepWithUIProps;
    }
  }

  // Assign children to their parents recursively, respecting branch
  for (const step of Object.values(idToStep)) {
    const { parentId, branch } = step;
    if (parentId && idToStep[parentId]) {
      const parent = idToStep[parentId];
      if (isConditionBlock(parent)) {
        if (branch === 'else') {
          parent.condition.else!.push(step);
        } else {
          parent.condition.steps.push(step);
        }
      }
    } else {
      rootSteps.push(step);
    }
  }

  // Remove UI properties from all steps for the final DSL
  function stripUIProperties(
    step: StreamlangStepWithUIProps,
    removeCustomIdentifiers: boolean
  ): StreamlangStep {
    if (isConditionBlock(step)) {
      const { parentId, branch, customIdentifier, ...whereRest } = step;
      const ifSteps = (whereRest.condition.steps as StreamlangStepWithUIProps[]).map((child) =>
        stripUIProperties(child, removeCustomIdentifiers)
      );
      const elseSteps = (whereRest.condition.else as StreamlangStepWithUIProps[] | undefined) ?? [];
      const strippedElse =
        elseSteps.length > 0
          ? elseSteps.map((child) => stripUIProperties(child, removeCustomIdentifiers))
          : undefined;

      const { steps: _s, else: _e, ...conditionOnly } = whereRest.condition;
      const condition = {
        ...conditionOnly,
        steps: ifSteps,
        ...(strippedElse ? { else: strippedElse } : {}),
      };

      return removeCustomIdentifiers
        ? { ...whereRest, condition }
        : { ...whereRest, customIdentifier, condition };
    } else {
      const { parentId, branch, customIdentifier, ...actionRest } = step;
      return removeCustomIdentifiers ? actionRest : { ...actionRest, customIdentifier };
    }
  }

  return {
    steps: rootSteps.map((child) => stripUIProperties(child, stripCustomIdentifiers)),
  };
};
