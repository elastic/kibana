/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { builtInStepDefinitions } from '@kbn/workflows';
import { registerGetStepDefinitionsTool } from './get_step_definitions_tool';

const mockGetAllConnectors = jest.fn();
const mockAddDynamicConnectorsToCache = jest.fn();
jest.mock('@kbn/workflows-management-plugin/common/schema', () => ({
  getAllConnectors: (...args: unknown[]) => mockGetAllConnectors(...args),
  addDynamicConnectorsToCache: (...args: unknown[]) => mockAddDynamicConnectorsToCache(...args),
  getCachedAllConnectorsMap: () => null,
  getDeprecatedStepMetadata: () => undefined,
}));

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerGetStepDefinitionsTool', () => {
  let registeredTool: BuiltinToolDefinition;
  const api = {
    getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 }),
  } as any;

  beforeEach(async () => {
    const { z } = await import('@kbn/zod/v4');
    mockGetAllConnectors.mockReturnValue([
      {
        type: 'kibana.createCase',
        description: 'Create a case in Kibana',
        summary: 'Creates a case',
        deprecation: {
          replacementStepType: 'cases.createCase',
        },
        paramsSchema: z.object({ title: z.string(), description: z.string().optional() }),
        outputSchema: z.object({ id: z.string() }),
        hasConnectorId: 'required',
        examples: {
          snippet: '- name: create\n  type: kibana.createCase\n  with:\n    title: "Test"',
        },
      },
      {
        type: 'http',
        description: 'Make an HTTP request',
        summary: 'HTTP connector',
        paramsSchema: z.object({ url: z.string(), method: z.string() }),
        outputSchema: z.object({ body: z.unknown() }),
        hasConnectorId: false,
      },
    ]);

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetStepDefinitionsTool(agentBuilder, api);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_step_definitions');
  });

  it('returns all step types without filters', async () => {
    const result = await invokeHandler(registeredTool, {}, { spaceId: 'default', request: {} });
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    expect(data.stepTypes.length).toBe(data.count);
    expect(data.stepTypes.some((step: any) => step.id === 'kibana.createCase')).toBe(false);
  });

  it('returns condensed results when many steps match', async () => {
    const result = await invokeHandler(registeredTool, {}, { spaceId: 'default', request: {} });
    const data = result.results[0].data as any;
    if (data.count > 5) {
      const first = data.stepTypes[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('label');
      expect(first).toHaveProperty('category');
      expect(first).not.toHaveProperty('inputParams');
      expect(first).not.toHaveProperty('stepSchema');
    }
  });

  it('returns separate inputParams and configParams in detailed results', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'if' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    const step = data.stepTypes[0];
    expect(step.id).toBe('if');
    // Single-step lookups now auto-include the JSON Schema so the model can
    // construct a valid `with:` payload in one round-trip.
    expect(step).toHaveProperty('stepSchema');
    expect(step).toHaveProperty('configParams');
    const configNames = step.configParams.map((p: any) => p.name);
    expect(configNames).toContain('condition');
    expect(configNames).toContain('steps');
  });

  it('omits stepSchema when results are a search/category browse, not a single-step lookup', async () => {
    const result = await invokeHandler(
      registeredTool,
      { category: 'flowControl' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(1);
    for (const step of data.stepTypes) {
      expect(step).not.toHaveProperty('stepSchema');
    }
  });

  it('does not include common properties (name, type, if, timeout) in params', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'console' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    const allParamNames = [
      ...(step.inputParams ?? []).map((p: any) => p.name),
      ...(step.configParams ?? []).map((p: any) => p.name),
    ];
    expect(allParamNames).not.toContain('name');
    expect(allParamNames).not.toContain('type');
    expect(allParamNames).not.toContain('if');
    expect(allParamNames).not.toContain('timeout');
  });

  it('does not include outputSummary by default', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.stepTypes[0]).not.toHaveProperty('outputSchema');
    expect(data.stepTypes[0]).not.toHaveProperty('outputSummary');
  });

  it('includes outputSummary when includeOutputSummary is true', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase', includeOutputSummary: true },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.stepTypes[0]).not.toHaveProperty('outputSchema');
    expect(data.stepTypes[0]).toHaveProperty('outputSummary');
    expect(typeof data.stepTypes[0].outputSummary).toBe('string');
  });

  it('returns full schema when includeFullSchema is true', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'if', includeFullSchema: true },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).toHaveProperty('stepSchema');
    expect(step.stepSchema).toHaveProperty('properties');
    expect(step).not.toHaveProperty('outputSchema');
  });

  it('returns connector-id info for connector steps', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    const step = data.stepTypes[0];
    expect(step.connectorId).toBe('required');
  });

  it('returns input params for connector steps', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).toHaveProperty('inputParams');
    const inputNames = step.inputParams.map((p: any) => p.name);
    expect(inputNames).toContain('title');
  });

  it('omits connector-id when not needed', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'http' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).not.toHaveProperty('connectorId');
  });

  it('includes config fields for flow-control built-in steps', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'foreach' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).toHaveProperty('configParams');
    const configNames = step.configParams.map((p: any) => p.name);
    expect(configNames).toContain('foreach');
    expect(configNames).toContain('steps');
  });

  it('filters by search term', async () => {
    const result = await invokeHandler(
      registeredTool,
      { search: 'case', includeDeprecated: true },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    expect(
      data.stepTypes.every((s: any) => {
        const concat = `${s.id} ${s.label} ${s.description ?? ''}`.toLowerCase();
        return concat.includes('case');
      })
    ).toBe(true);
  });

  it('excludes deprecated steps from search results by default', async () => {
    const result = await invokeHandler(
      registeredTool,
      { search: 'case' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;

    expect((data.stepTypes ?? []).some((step: any) => step.id === 'kibana.createCase')).toBe(false);
  });

  it('returns deprecated steps for exact stepType lookups', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];

    expect(step.id).toBe('kibana.createCase');
    expect(step.deprecated).toBe(true);
    expect(step.replacementStepType).toBe('cases.createCase');
    expect(step.deprecationMessage).toContain('Step type "kibana.createCase" is deprecated');
  });

  it('includes deprecated steps in discovery when includeDeprecated is true', async () => {
    const result = await invokeHandler(
      registeredTool,
      { includeDeprecated: true },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;

    expect(data.stepTypes.some((step: any) => step.id === 'kibana.createCase')).toBe(true);
  });

  it('filters by category', async () => {
    const result = await invokeHandler(
      registeredTool,
      { category: 'flowControl' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const builtInFlowControl = builtInStepDefinitions.filter((s) => s.category === 'flowControl');
    expect(data.count).toBe(builtInFlowControl.length);
  });

  it('returns error for unknown step type', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'nonexistent_step' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.error).toContain('not found');
  });

  it('deduplicates built-in steps from connector list', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'http' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const httpSteps = data.stepTypes.filter((s: any) => s.id === 'http');
    expect(httpSteps.length).toBeLessThanOrEqual(1);
  });

  it('returns results in expected shape', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'foreach' },
      { spaceId: 'default', request: {} }
    );
    expect(result).toHaveProperty('results');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    expect(result.results[0]).toHaveProperty('data');
  });

  it('includes examples from connector definitions', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.stepTypes[0].examples).toBeDefined();
    expect(data.stepTypes[0].examples[0]).toContain('kibana.createCase');
  });
});

describe('registerGetStepDefinitionsTool with workflows-extensions registry', () => {
  let registeredTool: BuiltinToolDefinition;
  const api = {
    getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 }),
  } as any;

  beforeEach(async () => {
    const { z } = await import('@kbn/zod/v4');
    mockGetAllConnectors.mockReturnValue([]);

    // Two extension-registered steps, plus one that intentionally collides
    // with a built-in (`console`) to exercise the dedup precedence rule
    // (built-in wins).
    const extensionStepDefinitions = [
      {
        id: 'security.renderAlertNarrative',
        label: 'Render alert narrative',
        description: 'Render a human-readable narrative for an alert.',
        category: 'external' as const,
        inputSchema: z.object({
          alert_id: z.string(),
          narrative_style: z.enum(['concise', 'detailed']).optional(),
        }),
        outputSchema: z.object({ narrative: z.string() }),
      },
      {
        id: 'data.find',
        label: 'Find',
        description: 'Locate the first matching record in a collection.',
        category: 'data' as const,
        inputSchema: z.object({
          items: z.array(z.unknown()),
          predicate: z.string(),
        }),
        outputSchema: z.object({ match: z.unknown().optional() }),
      },
      {
        id: 'console', // collides with @kbn/workflows built-in
        label: 'Console (extension)',
        description: 'Should be shadowed by the built-in definition.',
        category: 'external' as const,
        inputSchema: z.object({ message: z.string() }),
        outputSchema: z.object({}),
      },
    ];

    const workflowsExtensions = {
      getAllStepDefinitions: jest.fn().mockReturnValue(extensionStepDefinitions),
    };

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetStepDefinitionsTool(agentBuilder, api, () => workflowsExtensions as any);
  });

  it('surfaces extension-registered steps in the discovery listing', async () => {
    const result = await invokeHandler(registeredTool, {}, { spaceId: 'default', request: {} });
    const data = result.results[0].data as any;
    const ids = data.stepTypes.map((step: any) => step.id);
    expect(ids).toContain('security.renderAlertNarrative');
    expect(ids).toContain('data.find');
  });

  it('returns full input schema on single-step lookup of an extension step', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'security.renderAlertNarrative' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    const step = data.stepTypes[0];
    expect(step.id).toBe('security.renderAlertNarrative');
    expect(step).toHaveProperty('stepSchema');
    expect(step.stepSchema).toHaveProperty('properties');
    // The extension's inputSchema must round-trip into the JSON Schema:
    // {properties: {with: {properties: {alert_id, narrative_style}}}}
    const schemaJson = JSON.stringify(step.stepSchema);
    expect(schemaJson).toContain('alert_id');
    expect(schemaJson).toContain('narrative_style');
  });

  it('dedupes extension steps that collide with a built-in (built-in wins)', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'console' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    const step = data.stepTypes[0];
    // Built-in label should be preserved; the extension's "Console
    // (extension)" label MUST NOT win.
    expect(step.label).not.toBe('Console (extension)');
  });

  it('tolerates a missing workflows-extensions start contract', async () => {
    const agentBuilder = {
      tools: { register: jest.fn((tool: BuiltinToolDefinition) => (registeredTool = tool)) },
    } as any;
    // Default getter resolves to undefined; the tool must still register and
    // serve built-in + connector sources only.
    registerGetStepDefinitionsTool(agentBuilder, api);
    const result = await invokeHandler(registeredTool, {}, { spaceId: 'default', request: {} });
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    expect(data.stepTypes.some((s: any) => s.id === 'security.renderAlertNarrative')).toBe(false);
  });
});
