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
      const id = step.customIdentifier || createId();

      const stepWithUI: StreamlangStepWithUIAttributes = {
        ...step,
        parentId,
        customIdentifier: step.customIdentifier || id,
      };

      // If this is a Where block with nested steps, unnest them.
      // Remove the steps property, as these will now become flattened items.
      if (isWhereBlock(stepWithUI) && Array.isArray(stepWithUI.where.steps)) {
        const {
          where: { steps: whereSteps, ...restWhere },
          ...rest
        } = stepWithUI;
        // Add the where block itself
        result.push({
          ...rest,
          where: {
            ...restWhere,
          },
        });
        // Recursively unnest children, passing the current id as parentId
        unnestSteps(stepWithUI.where.steps, id);
      } else {
        // Add non-where steps
        result.push(stepWithUI);
      }
    }
  }

  unnestSteps(dsl.steps);

  return result;
};

export const convertUIStepsToDSL = (steps: StreamlangStepWithUIAttributes[]): StreamlangDSL => {
  const idToStep: Record<string, any> = {};
  const rootSteps: any[] = [];

  // Prepare all steps and ensure where.steps exists for where blocks
  for (const step of steps) {
    const { customIdentifier, parentId, ...rest } = step;
    const stepObj: any = { ...rest, customIdentifier };
    // Where block
    if ('where' in stepObj && !('steps' in stepObj.where) && !('action' in stepObj)) {
      stepObj.where = { ...stepObj.where, steps: [] };
    }
    idToStep[customIdentifier] = { ...stepObj, parentId }; // keep parentId for now
  }

  // Assign children to their parents recursively
  for (const step of Object.values(idToStep)) {
    const { parentId } = step;
    if (parentId && idToStep[parentId]) {
      const parent = idToStep[parentId];
      if (parent.where && Array.isArray(parent.where.steps)) {
        parent.where.steps.push(step);
      }
    } else {
      rootSteps.push(step);
    }
  }

  // Remove parentId from all steps for the final DSL
  function stripParentId(step: any): any {
    const { parentId, ...rest } = step;
    if (rest.where && Array.isArray(rest.where.steps)) {
      return {
        ...rest,
        where: {
          ...rest.where,
          steps: rest.where.steps.map(stripParentId),
        },
      };
    }
    return rest;
  }

  return {
    steps: rootSteps.map(stripParentId),
  };
};
