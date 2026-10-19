/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExecutionId, parseExecutionIdModelSegment } from './build_execution_id';

describe('buildExecutionId', () => {
  it('combines build, suite, and model into a single key', () => {
    expect(
      buildExecutionId({
        baseExecutionId: 'bk-build-1',
        suiteId: 'significant-events',
        modelId: 'gpt-4',
      })
    ).toBe('bk-build-1::significant-events::gpt-4');
  });

  it('gives two suites in the same build distinct execution ids for the same model', () => {
    const suiteA = buildExecutionId({
      baseExecutionId: 'bk-build-1',
      suiteId: 'significant-events',
      modelId: 'gpt-4',
    });
    const suiteB = buildExecutionId({
      baseExecutionId: 'bk-build-1',
      suiteId: 'streams',
      modelId: 'gpt-4',
    });

    expect(suiteA).not.toBe(suiteB);
  });

  it('appends the reasoning effort to the model segment', () => {
    expect(
      buildExecutionId({
        baseExecutionId: 'bk-build-1',
        suiteId: 'significant-events',
        modelId: 'claude-opus',
        reasoningEffort: 'high',
      })
    ).toBe('bk-build-1::significant-events::claude-opus@high');
  });

  it('gives the same model at two reasoning efforts distinct execution ids', () => {
    const low = buildExecutionId({
      baseExecutionId: 'bk-build-1',
      suiteId: 'significant-events',
      modelId: 'claude-opus',
      reasoningEffort: 'low',
    });
    const high = buildExecutionId({
      baseExecutionId: 'bk-build-1',
      suiteId: 'significant-events',
      modelId: 'claude-opus',
      reasoningEffort: 'high',
    });

    expect(low).not.toBe(high);
  });

  it('omits the suite id when no suite id is provided (e.g. in-tool evals)', () => {
    expect(
      buildExecutionId({
        baseExecutionId: 'bk-build-1',
        modelId: 'gpt-4',
      })
    ).toBe('bk-build-1::gpt-4');
  });

  it('returns just the base execution id when neither suite nor model is provided', () => {
    expect(buildExecutionId({ baseExecutionId: 'bk-build-1' })).toBe('bk-build-1');
  });

  it('omits the model segment when no model id is provided', () => {
    expect(
      buildExecutionId({
        baseExecutionId: 'bk-build-1',
        suiteId: 'significant-events',
      })
    ).toBe('bk-build-1::significant-events');
  });

  it('returns undefined when no base execution id is provided', () => {
    expect(buildExecutionId({ suiteId: 'significant-events', modelId: 'gpt-4' })).toBeUndefined();
  });

  it('returns an empty string when the base execution id is empty', () => {
    expect(
      buildExecutionId({ baseExecutionId: '', suiteId: 'significant-events', modelId: 'gpt-4' })
    ).toBe('');
  });
});

describe('parseExecutionIdModelSegment', () => {
  it('reads the model and effort back out of a variant segment', () => {
    expect(parseExecutionIdModelSegment('claude-opus@high')).toEqual({
      modelId: 'claude-opus',
      reasoningEffort: 'high',
    });
  });

  it('leaves a plain model segment without an effort', () => {
    expect(parseExecutionIdModelSegment('claude-opus')).toEqual({ modelId: 'claude-opus' });
  });

  it('keeps an @ that is not followed by a reasoning effort level in the model id', () => {
    expect(parseExecutionIdModelSegment('mistral-large@2407')).toEqual({
      modelId: 'mistral-large@2407',
    });
  });

  it('round-trips what buildExecutionId produced', () => {
    const executionId = buildExecutionId({
      baseExecutionId: 'bk-build-1',
      suiteId: 'significant-events',
      modelId: 'claude-opus',
      reasoningEffort: 'low',
    })!;

    expect(parseExecutionIdModelSegment(executionId.split('::').pop()!)).toEqual({
      modelId: 'claude-opus',
      reasoningEffort: 'low',
    });
  });
});
