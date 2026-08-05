/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { internalTools, ToolResultType } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { createSearchRelevantSkillsTool } from './search_relevant_skills';

const skill = (overrides: Partial<InternalSkillDefinition>): InternalSkillDefinition =>
  ({
    id: 'platform.core.test-skill',
    name: 'test-skill',
    description: 'A test skill',
    basePath: 'skills/platform/core',
    referencedContent: [],
    ...overrides,
  } as unknown as InternalSkillDefinition);

describe('createSearchRelevantSkillsTool', () => {
  const logger = loggingSystemMock.createLogger();

  it('exposes the search_relevant_skills id and a query schema', () => {
    const tool = createSearchRelevantSkillsTool({
      modelProvider: { selectModel: jest.fn() } as unknown as ModelProvider,
      filteredSkills: [],
      logger,
    });
    expect(tool.id).toBe(internalTools.searchRelevantSkills);
    expect(tool.schema.shape.query).toBeDefined();
  });

  it('returns matching skills as a normal "other" tool result', async () => {
    const selectModel = jest.fn();
    const tool = createSearchRelevantSkillsTool({
      modelProvider: { selectModel } as unknown as ModelProvider,
      // At/below the small threshold → resolved without a model call.
      filteredSkills: [skill({ id: 'a.alpha', name: 'alpha', description: 'Alpha' })],
      logger,
    });

    const result = await tool.handler({ query: 'do alpha' }, {} as any);
    if (!('results' in result)) {
      throw new Error('expected a results-bearing tool return');
    }

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.other);
    const data = result.results[0].data as { skills: Array<{ id: string; name: string }> };
    expect(data.skills[0]).toMatchObject({ id: 'a.alpha', name: 'alpha' });
    expect(selectModel).not.toHaveBeenCalled();
  });
});
