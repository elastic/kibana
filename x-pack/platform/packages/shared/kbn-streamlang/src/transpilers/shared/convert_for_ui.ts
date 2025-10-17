/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import type { StreamlangStepWithUIAttributes } from '../../../types/ui';
import { isWhereBlock, type StreamlangDSL, type StreamlangStep } from '../../../types/streamlang';

const createId = htmlIdGenerator();

export const convertStepsForUI = (dsl: StreamlangDSL): StreamlangStepWithUIAttributes[] => {
  const result: StreamlangStepWithUIAttributes[] = [];

  function unnestSteps(steps: StreamlangStep[], parentId: string | null = null) {
    for (const step of steps) {
      const stepWithUI = convertStepToUIDefinition(step, { parentId });

      // If this is a Where block with nested steps, unnest them.
      // Remove the steps property, as these will now become flattened items.
      if (isWhereBlock(step) && Array.isArray(step.where.steps)) {
        // Add the where block itself
        result.push(stepWithUI);
        // Recursively unnest children, passing the current id as parentId
        unnestSteps(step.where.steps, stepWithUI.customIdentifier);
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
  options: { parentId: StreamlangStepWithUIAttributes['parentId'] }
): StreamlangStepWithUIAttributes => {
  const id = step.customIdentifier || createId();

  // If this is a where step, remove where.steps.
  // UI versions of the steps keep a flat array and work off parentId to represent hierarchy.
  if (isWhereBlock(step) && Array.isArray(step.where.steps)) {
    const { steps, ...whereWithoutSteps } = step.where;
    return {
      customIdentifier: id,
      parentId: options.parentId,
      ...step,
      where: whereWithoutSteps,
    };
  }
  return {
    customIdentifier: id,
    parentId: options.parentId,
    ...step,
  };
};

type StreamlangStepWithParentId = StreamlangStep & { parentId: string | null };
export const convertUIStepsToDSL = (
  steps: StreamlangStepWithUIAttributes[],
  stripCustomIdentifiers: boolean = true
): StreamlangDSL => {
  const idToStep: Record<string, StreamlangStepWithParentId> = {};
  const rootSteps: Array<StreamlangStepWithParentId> = [];

  // Prepare all steps and ensure where.steps exists for where blocks
  for (const step of steps) {
    const { customIdentifier, parentId, ...rest } = step;
    const stepObj: Omit<StreamlangStepWithUIAttributes, 'parentId'> = { ...rest, customIdentifier };
    // Where block
    if (isWhereBlock(stepObj)) {
      // Ensure where is always present and has steps
      stepObj.where = { ...stepObj.where, steps: [] };
      idToStep[customIdentifier] = { ...stepObj, parentId } as StreamlangStepWithParentId;
    } else {
      idToStep[customIdentifier] = { ...stepObj, parentId } as StreamlangStepWithParentId;
    }
  }

  // Assign children to their parents recursively
  for (const step of Object.values(idToStep)) {
    const { parentId } = step;
    if (parentId && idToStep[parentId]) {
      const parent = idToStep[parentId];
      if (isWhereBlock(parent)) {
        parent.where.steps.push(step);
      }
    } else {
      rootSteps.push(step);
    }
  }

  // Remove parentId from all steps for the final DSL
  function stripUIProperties(
    step: StreamlangStepWithParentId,
    removeCustomIdentifiers: boolean
  ): StreamlangStep {
    if (isWhereBlock(step)) {
      const { parentId, customIdentifier, ...whereRest } = step;
      return {
        ...(removeCustomIdentifiers ? { ...whereRest } : { ...whereRest, customIdentifier }),
        where: {
          ...whereRest.where,
          steps: (whereRest.where.steps as StreamlangStepWithParentId[]).map((child) =>
            stripUIProperties(child, removeCustomIdentifiers)
          ),
        },
      };
    } else {
      const { parentId, customIdentifier, ...actionRest } = step;
      return removeCustomIdentifiers ? actionRest : { ...actionRest, customIdentifier };
    }
  }

  return {
    steps: rootSteps.map((child) => stripUIProperties(child, stripCustomIdentifiers)),
  };
};
