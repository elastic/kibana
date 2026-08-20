/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { casesTool } from './cases';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../../types';

const buildTool = () =>
  casesTool({
    getStartServices: jest.fn(),
  } as unknown as CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>);

describe('casesTool schema', () => {
  it('rejects more than 100 alertIds at the schema level', () => {
    const tool = buildTool();

    const tooMany = tool.schema.safeParse({
      alertIds: Array.from({ length: 101 }, (_, i) => `alert-${i}`),
    });
    expect(tooMany.success).toBe(false);

    const atLimit = tool.schema.safeParse({
      alertIds: Array.from({ length: 100 }, (_, i) => `alert-${i}`),
    });
    expect(atLimit.success).toBe(true);
  });
});
