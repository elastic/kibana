/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Scalar } from 'yaml';
import type { LineCounter } from 'yaml';
import { validateStepExposure } from './validate_step_exposure';
import { getStepExposure } from '../../../../common/schema';
import type { StepPropInfo } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { createStepInfo, createWorkflowLookup } from '../../../shared/test_utils/step_info_factory';

jest.mock('../../../../common/schema', () => ({
  getStepExposure: jest.fn(),
}));

const mockLineCounter: LineCounter = {
  linePos: (offset: number) => ({ line: offset + 1, col: 1 }),
  lineStarts: [],
  addNewLine(offset: number): number {
    return offset + 1;
  },
};

const createTypePropInfo = (stepType: string): StepPropInfo => {
  const keyNode = new Scalar('type');
  keyNode.range = [0, 4, 4];

  const valueNode = new Scalar(stepType);
  valueNode.range = [10, 20, 20];

  return { path: ['type'], keyNode, valueNode };
};

const createStep = (stepType: string) =>
  createStepInfo({
    stepId: stepType,
    stepType,
    propInfos: { type: createTypePropInfo(stepType) },
  });

describe('validateStepExposure', () => {
  const lookup = createWorkflowLookup([
    createStep('custom.open'),
    createStep('custom.internal'),
    createStep('custom.managedOnly'),
  ]);

  beforeEach(() => {
    jest.mocked(getStepExposure).mockImplementation((stepType: string) => {
      if (stepType === 'custom.internal') {
        return 'internal';
      }
      if (stepType === 'custom.managedOnly') {
        return 'managed_only';
      }
      return 'open';
    });
  });

  it('warns about internal steps and errors on managed-only steps in workflows that are not managed', () => {
    const results = validateStepExposure(lookup, mockLineCounter, false);

    expect(results).toEqual([
      expect.objectContaining({
        owner: 'step-exposure-validation',
        ruleId: 'internalStepType',
        severity: 'warning',
        hoverMessage: null,
        message:
          'Step type "custom.internal" is an internal step. Use it at your own risk: its inputs, outputs and behavior can change without notice.',
        startLineNumber: 11,
        endLineNumber: 21,
      }),
      expect.objectContaining({
        owner: 'step-exposure-validation',
        ruleId: 'managedOnlyStepType',
        severity: 'error',
        hoverMessage: null,
        message:
          'Step type "custom.managedOnly" is an internal step and can\'t be used in custom workflows.',
        startLineNumber: 11,
        endLineNumber: 21,
      }),
    ]);
  });

  it('accepts internal and managed-only steps in managed workflows', () => {
    expect(validateStepExposure(lookup, mockLineCounter, true)).toEqual([]);
  });

  it('skips steps without a type value range', () => {
    const stepWithoutRange = createStepInfo({
      stepId: 'no_range',
      stepType: 'custom.managedOnly',
      propInfos: {},
    });

    expect(
      validateStepExposure(createWorkflowLookup([stepWithoutRange]), mockLineCounter, false)
    ).toEqual([]);
  });
});
