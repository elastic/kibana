/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { STEP_EXECUTION_REASONS } from './execution_reason';

const STEPS_DIR = join(__dirname, '..', 'steps');

/** `public readonly name = 'fetch_rule';`, as every step class declares it. */
const STEP_NAME_PATTERN = /readonly\s+name\s*=\s*['"]([^'"]+)['"]/;

/**
 * Names of the steps the pipeline can run, read from the source files rather
 * than from the classes: several steps do work in their constructors, so they
 * cannot be instantiated without their injected dependencies just to be
 * asked their name.
 */
const readStepNames = (): string[] =>
  readdirSync(STEPS_DIR)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== 'index.ts')
    .flatMap((file) => {
      const match = readFileSync(join(STEPS_DIR, file), 'utf8').match(STEP_NAME_PATTERN);
      return match ? [match[1]] : [];
    });

describe('STEP_EXECUTION_REASONS', () => {
  const stepNames = readStepNames();

  /**
   * Without this, moving the steps folder would leave the two tests below
   * comparing one empty list against another and passing for the wrong reason.
   */
  it('reads the steps it is meant to guard', () => {
    expect(stepNames.length).toBeGreaterThan(0);
  });

  it('publishes a reason for every step in the pipeline', () => {
    const unmapped = stepNames.filter((name) => STEP_EXECUTION_REASONS[name] === undefined);

    // A new step needs an entry: a code of its own, or UNEXPECTED_ERROR.
    expect(unmapped).toEqual([]);
  });

  it('publishes no reason for a step the pipeline no longer has', () => {
    const stale = Object.keys(STEP_EXECUTION_REASONS).filter((name) => !stepNames.includes(name));

    // A renamed or removed step leaves its old name behind: update the key,
    // keeping the published code unchanged.
    expect(stale).toEqual([]);
  });
});
