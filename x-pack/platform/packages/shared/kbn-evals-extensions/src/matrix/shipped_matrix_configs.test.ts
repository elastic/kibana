/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
} from '@kbn/evals';
import { loadMatrixConfig } from './load_matrix_config';

/**
 * The weekly CI matrix reads dataset-level stats, which carry no
 * `evaluator.kind`, so the config restates each evaluator's kind for the
 * contract/judged split. A restatement that drifts from the evaluator's own
 * declaration would move it into the wrong half without any error.
 */
describe('security_matrix_persona.json (weekly CI matrix)', () => {
  const config = loadMatrixConfig(
    Path.resolve(__dirname, '../../config/security_matrix_persona.json')
  );

  it('restates the kind each shared judged evaluator declares', () => {
    const declared = config.subScores?.evaluatorKinds ?? {};
    for (const evaluator of [
      ...createQuantitativeCorrectnessEvaluators(),
      createQuantitativeGroundednessEvaluator(),
    ]) {
      expect([evaluator.name, declared[evaluator.name]]).toEqual([
        evaluator.name,
        evaluator.kind.toLowerCase(),
      ]);
    }
  });

  it('classifies the persona contract evaluators as code', () => {
    const declared = config.subScores?.evaluatorKinds ?? {};
    for (const name of [
      'SkillInvoked',
      'Trajectory',
      'ExpectedToolCalled',
      'FinalAnswerPresent',
      'MinExpectedSteps',
    ]) {
      expect([name, declared[name]]).toEqual([name, 'code']);
    }
  });

  it('ties adjacent rows on the measured judge noise floor', () => {
    expect(config.overall.noiseFloor).toMatchObject({ value: 0.352, basis: 'evaluator-score' });
  });
});
