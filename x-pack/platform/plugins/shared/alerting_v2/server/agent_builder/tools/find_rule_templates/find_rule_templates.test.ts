/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import type { RuleTemplatesClient } from '../../../lib/rule_templates_client';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import { findRuleTemplatesTool } from './find_rule_templates';

const buildTemplate = (
  id: string,
  {
    name,
    base,
    kind = 'alert',
    tags,
    ruleCount,
  }: {
    name: string;
    base: string;
    kind?: 'alert' | 'signal';
    tags?: string[];
    ruleCount?: number;
  }
): RuleTemplateResponse => ({
  id,
  engine: 'v2',
  rule: {
    kind,
    metadata: { name, ...(tags ? { tags } : {}) },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    query: { base, breach: { segment: 'WHERE c > 10' } },
    grouping: { fields: ['host.name'] },
  },
  ...(ruleCount !== undefined ? { rule_count: ruleCount } : {}),
});

const TEMPLATES = [
  buildTemplate('nginx-errors', {
    name: 'Nginx errors',
    base: 'FROM logs-nginx.access-* | STATS c = COUNT(*) BY host.name',
    tags: ['nginx'],
    ruleCount: 2,
  }),
  buildTemplate('host-cpu', {
    name: 'Host CPU',
    base: 'FROM metrics-system.cpu-* | STATS c = AVG(system.cpu.total.norm.pct) BY host.name',
  }),
  buildTemplate('k8s-restarts', {
    name: 'Pod restarts',
    base: 'TS metrics-* | STATS c = MAX(k8s.container.restarts) BY host.name',
    kind: 'signal',
    tags: ['kubernetes'],
  }),
];

describe('findRuleTemplatesTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let findRuleTemplates: jest.Mock;
  let ctx: ToolHandlerContextMock;

  const getResolveIndexMock = () =>
    ctx.esClient.asCurrentUser.indices.resolveIndex as unknown as jest.Mock;

  const createTool = (canRead: boolean = true) =>
    findRuleTemplatesTool({
      logger: loggerService,
      getRuleTemplatesClient: () => ({ findRuleTemplates } as unknown as RuleTemplatesClient),
      getPrivilegeChecker: () =>
        ({
          canRead: jest.fn().mockResolvedValue(canRead),
          canWrite: jest.fn(),
        } as unknown as PrivilegeChecker),
    });

  const run = async (input: Record<string, unknown> = {}, canRead = true) => {
    const tool = createTool(canRead);
    const result = await tool.handler(tool.schema.parse(input), ctx);
    return 'results' in result ? result.results[0] : undefined;
  };

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    findRuleTemplates = jest.fn().mockResolvedValue({
      items: TEMPLATES,
      total: TEMPLATES.length,
      page: 1,
      per_page: 100,
    });
    ctx = agentBuilderMocks.tools.createHandlerContext();
    getResolveIndexMock().mockResolvedValue({ indices: [], aliases: [], data_streams: [] });
  });

  it('returns an unauthorized result without rules read privilege', async () => {
    const result = await run({}, false);
    expect(result?.type).toBe(ToolResultType.error);
    expect(findRuleTemplates).not.toHaveBeenCalled();
  });

  it('forwards search and tags to the client', async () => {
    await run({ search: 'errors', tags: ['nginx'] });
    expect(findRuleTemplates).toHaveBeenCalledWith({
      search: 'errors',
      tags: ['nginx'],
      perPage: 100,
    });
  });

  it('summarizes templates with their derived source', async () => {
    const result = await run({ integration: 'nginx' });
    expect(result?.data).toEqual({
      total: 1,
      templates: [
        {
          id: 'nginx-errors',
          name: 'Nginx errors',
          kind: 'alert',
          tags: ['nginx'],
          integration: 'nginx',
          index_patterns: ['logs-nginx.access-*'],
          data_streams: [{ type: 'logs', dataset: 'nginx.access' }],
          has_data: false,
          query: {
            base: 'FROM logs-nginx.access-* | STATS c = COUNT(*) BY host.name',
            breach: { segment: 'WHERE c > 10' },
          },
          grouping_fields: ['host.name'],
          schedule: { every: '1m', lookback: '5m' },
          rule_count: 2,
        },
      ],
    });
  });

  it('matches an integration through a tag when the query pattern is broad', async () => {
    const result = await run({ integration: 'Kubernetes' });
    expect(result?.data).toMatchObject({ total: 1, templates: [{ id: 'k8s-restarts' }] });
  });

  it('filters by dataset and kind', async () => {
    expect((await run({ dataset: 'system.cpu' }))?.data).toMatchObject({
      templates: [{ id: 'host-cpu' }],
    });
    expect((await run({ kind: 'signal' }))?.data).toMatchObject({
      templates: [{ id: 'k8s-restarts' }],
    });
  });

  it('applies the limit after filtering and reports the full match count', async () => {
    const result = await run({ limit: 1 });
    expect(result?.data).toMatchObject({ total: 3, templates: [{ id: 'nginx-errors' }] });
  });

  it('reports has_data when the sources resolve', async () => {
    getResolveIndexMock().mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [{ name: 'logs-nginx.access-default' }],
    });
    const result = await run({ integration: 'nginx' });
    expect(result?.data).toMatchObject({ templates: [{ has_data: true }] });
    expect(getResolveIndexMock()).toHaveBeenCalledWith(
      expect.objectContaining({ name: ['logs-nginx.access-*'] })
    );
  });

  it('omits has_data when the lookup fails', async () => {
    getResolveIndexMock().mockRejectedValue(new Error('boom'));
    const result = await run({ integration: 'nginx' });
    const { templates } = result?.data as { templates: Array<Record<string, unknown>> };
    expect(templates[0]).not.toHaveProperty('has_data');
  });

  it('returns an error result and logs when the client fails', async () => {
    findRuleTemplates.mockRejectedValue(new Error('so failure'));
    const result = await run();
    expect(result?.type).toBe(ToolResultType.error);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to find rule templates',
      expect.objectContaining({
        labels: expect.objectContaining({
          code: ALERTING_LOG_CODES.AGENT_BUILDER_FIND_RULE_TEMPLATES_FAILED,
        }),
      })
    );
  });
});
