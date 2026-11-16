/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import { submitAnalysisTool } from './submit_analysis';

describe('submitAnalysisTool', () => {
  it('accepts an analysis longer than a description', async () => {
    const content = 'a'.repeat(20_000);

    const result = await submitAnalysisTool().invoke({ content, summary: 'summary' });

    expect(result).toBeInstanceOf(Command);
    expect(result.update).toMatchObject({ analysis: content });
  });
});
