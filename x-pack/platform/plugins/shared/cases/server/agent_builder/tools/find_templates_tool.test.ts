/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { createCasesClientMock, type CasesClientMock } from '../../client/mocks';
import { findTemplatesTool } from './find_templates_tool';

const buildToolContext = (): ToolHandlerContext =>
  ({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    logger: loggingSystemMock.createLogger(),
  } as unknown as ToolHandlerContext);

const buildTemplate = (overrides: Record<string, unknown> = {}) => ({
  templateId: 'template-1',
  name: 'Phishing triage',
  owner: 'securitySolution',
  definition: 'name: Phishing triage',
  templateVersion: 1,
  deletedAt: null,
  description: 'Template for phishing triage cases',
  tags: ['phishing'],
  author: 'elastic',
  usageCount: 3,
  fieldCount: 2,
  fieldDefinitions: [],
  lastUsedAt: '2026-01-01T00:00:00.000Z',
  isDefault: false,
  isLatest: true,
  isEnabled: true,
  fieldSearchMatches: false,
  ...overrides,
});

describe('findTemplatesTool', () => {
  let casesClient: CasesClientMock;

  beforeEach(() => {
    casesClient = createCasesClientMock();
  });

  const buildTool = () => findTemplatesTool(jest.fn().mockResolvedValue(casesClient));

  it('has the correct tool id', () => {
    const tool = buildTool();
    expect(tool.id).toBe('platform.core.cases.find_templates');
  });

  it('has read-only annotations', () => {
    const tool = buildTool();
    expect(tool.annotations).toEqual({
      title: 'Find Case Templates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('schema requires owner and makes search optional', () => {
    const tool = buildTool();
    const shape = tool.schema.shape;
    expect(shape).toHaveProperty('owner');
    expect(shape).toHaveProperty('search');
    expect(shape.owner.isOptional()).toBe(false);
    expect(shape.search.isOptional()).toBe(true);
  });

  it('calls getAllTemplates with the search term scoped to the owner', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate()],
      page: 1,
      perPage: 20,
      total: 1,
    });

    const tool = buildTool();
    await tool.handler(
      { owner: 'securitySolution', search: 'phishing' } as never,
      buildToolContext()
    );

    expect(casesClient.templates.getAllTemplates).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: ['securitySolution'],
        search: 'phishing',
        page: 1,
        perPage: 20,
      })
    );
  });

  it('defaults isEnabled to true when omitted, since disabled templates cannot create a case', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate()],
      page: 1,
      perPage: 20,
      total: 1,
    });

    const tool = buildTool();
    await tool.handler({ owner: 'securitySolution' } as never, buildToolContext());

    expect(casesClient.templates.getAllTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: true })
    );
  });

  it('forwards an explicit isEnabled: false to look up disabled templates', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate({ isEnabled: false })],
      page: 1,
      perPage: 20,
      total: 1,
    });

    const tool = buildTool();
    await tool.handler(
      { owner: 'securitySolution', isEnabled: false } as never,
      buildToolContext()
    );

    expect(casesClient.templates.getAllTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false })
    );
  });

  it('defaults search to an empty string to list all templates for the owner', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate()],
      page: 1,
      perPage: 20,
      total: 1,
    });

    const tool = buildTool();
    await tool.handler({ owner: 'securitySolution' } as never, buildToolContext());

    expect(casesClient.templates.getAllTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ search: '' })
    );
  });

  it('maps matching templates into lean results', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate()],
      page: 1,
      perPage: 20,
      total: 1,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', search: 'phishing' } as never,
      buildToolContext()
    );

    const { results } = result as {
      results: Array<{ type: string; data: { templates: Array<Record<string, unknown>> } }>;
    };
    expect(results[0].data).toMatchObject({
      total: 1,
      templates: [
        {
          templateId: 'template-1',
          name: 'Phishing triage',
          description: 'Template for phishing triage cases',
          owner: 'securitySolution',
          tags: ['phishing'],
          isEnabled: true,
          nameMatch: true,
        },
      ],
    });
    // `toMatchObject` tolerates extra keys, so guard against a later `...template` spread leaking
    // heavy or internal fields into the agent-facing row.
    expect(results[0].data.templates[0]).not.toHaveProperty('definition');
    expect(results[0].data.templates[0]).not.toHaveProperty('fieldDefinitions');
    expect(results[0].data.templates[0]).not.toHaveProperty('fieldSearchMatches');
  });

  it('flags a single result as needing confirmation when it only matched a field/description, not the name', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [
        buildTemplate({
          name: 'SOC Intake',
          description: 'General intake template',
          fieldSearchMatches: true,
        }),
      ],
      page: 1,
      perPage: 20,
      total: 1,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', search: 'phishing' } as never,
      buildToolContext()
    );

    const { results } = result as {
      results: Array<{
        type: string;
        data: { templates: Array<{ nameMatch: boolean }>; message?: string };
      }>;
    };
    expect(results[0].data.templates[0].nameMatch).toBe(false);
    expect(results[0].data.message).toContain('only matched on a field name/label or description');
  });

  it('does not emit the field-only warning when total is greater than 1, even if the only row on the page is a field-only hit', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [
        buildTemplate({
          name: 'SOC Intake',
          description: 'General intake template',
          fieldSearchMatches: true,
        }),
      ],
      page: 2,
      perPage: 1,
      total: 2,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', search: 'phishing', page: 2, perPage: 1 } as never,
      buildToolContext()
    );

    const { results } = result as { results: Array<{ type: string; data: { message?: string } }> };
    expect(results[0].data.message).not.toContain('only matched on a field name/label');
    expect(results[0].data.message).toContain('2 templates matched');
  });

  it('does not flag a match when the template name itself contains the search term', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate()],
      page: 1,
      perPage: 20,
      total: 1,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', search: 'phishing' } as never,
      buildToolContext()
    );

    const { results } = result as { results: Array<{ type: string; data: { message?: string } }> };
    expect(results[0].data.message).toBeUndefined();
  });

  it('returns a helpful message when no templates match', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [],
      page: 1,
      perPage: 20,
      total: 0,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', search: 'nonexistent' } as never,
      buildToolContext()
    );

    const { results } = result as { results: Array<{ type: string; data: unknown }> };
    expect(results[0].data).toMatchObject({
      total: 0,
      templates: [],
      message: 'No templates found matching "nonexistent" for owner "securitySolution".',
    });
  });

  it('adds a pagination hint when more results exist than the current page', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate()],
      page: 1,
      perPage: 1,
      total: 2,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', perPage: 1 } as never,
      buildToolContext()
    );

    const { results } = result as { results: Array<{ type: string; data: { message?: string } }> };
    expect(results[0].data.message).toContain('Showing page 1 of 2');
  });

  it('on the last page with total > 1, replaces the pagination hint with an ask-the-user message so a lone row is not mistaken for a unique hit', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [buildTemplate()],
      page: 2,
      perPage: 1,
      total: 2,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', page: 2, perPage: 1, search: 'phishing' } as never,
      buildToolContext()
    );

    const { results } = result as {
      results: Array<{ type: string; data: { total: number; message?: string } }>;
    };
    expect(results[0].data.total).toBe(2);
    expect(results[0].data.message).not.toContain('Showing page');
    expect(results[0].data.message).toContain('2 templates matched "phishing"');
    expect(results[0].data.message).toContain('Ask the user which one they meant');
  });

  it('emits the multiple-matches message when several templates fit on a single page', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [
        buildTemplate(),
        buildTemplate({ templateId: 'template-2', name: 'Phishing escalation' }),
      ],
      page: 1,
      perPage: 20,
      total: 2,
    });

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', search: 'phishing' } as never,
      buildToolContext()
    );

    const { results } = result as { results: Array<{ type: string; data: { message?: string } }> };
    expect(results[0].data.message).toContain('2 templates matched "phishing"');
  });

  it('clamps perPage to the maximum allowed value', async () => {
    casesClient.templates.getAllTemplates.mockResolvedValue({
      templates: [],
      page: 1,
      perPage: 50,
      total: 0,
    });

    const tool = buildTool();
    await tool.handler({ owner: 'securitySolution', perPage: 500 } as never, buildToolContext());

    expect(casesClient.templates.getAllTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ perPage: 50 })
    );
  });

  it('returns an error result when the client throws', async () => {
    casesClient.templates.getAllTemplates.mockRejectedValue(new Error('boom'));

    const tool = buildTool();
    const result = await tool.handler(
      { owner: 'securitySolution', search: 'phishing' } as never,
      buildToolContext()
    );

    const { results } = result as { results: Array<{ type: string; data: unknown }> };
    expect(results[0]).toMatchObject({
      data: expect.objectContaining({ message: expect.stringContaining('boom') }),
    });
  });
});
