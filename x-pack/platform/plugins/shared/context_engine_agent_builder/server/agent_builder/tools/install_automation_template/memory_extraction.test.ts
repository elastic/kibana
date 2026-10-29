/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowSchema } from '@kbn/workflows/spec/schema';
import { parse } from 'yaml';
import {
  buildExtractionOutputSchema,
  compileMemoryCustomExtractionConfig,
  compileMemoryExtractionConfig,
  extractionSourcesSchema,
  memoryExtractionConfigSchema,
  toStoredSources,
  type MemoryCustomExtractionConfig,
  type MemoryExtractionConfig,
} from './memory_extraction';
import {
  AUTOMATION_TEMPLATE_TAGS,
  renderMemoryCustomExtractionTemplate,
  renderMemoryExtractionTemplate,
} from './render';

const sreConfig: MemoryExtractionConfig = {
  instructions: "We are an SRE team. 'checkout' means checkout-service. Ignore small talk.",
  facts: [
    {
      type: 'incident',
      description: 'Something failed: what failed, the root cause, and how it was resolved.',
    },
    {
      type: 'preference',
      description: 'How the user wants work done: formats, channels, escalation.',
    },
  ],
  entities: [
    {
      type: 'service',
      description: 'A deployed software service.',
      attributes: { owner: 'The team that owns the service.', tier: 'Criticality tier, 1 to 3.' },
    },
    {
      type: 'person',
      description: 'Someone the agent works with.',
      attributes: { role: 'Their job role.', team: 'The team they belong to.' },
    },
  ],
  relationships: [
    {
      type: 'owned_by',
      description: 'A service is owned by a person.',
      source: 'service',
      target: 'person',
    },
    {
      type: 'caused_by',
      description: 'An incident was caused by an earlier incident.',
      source: 'incident',
      target: 'incident',
    },
  ],
};

const customConfig: MemoryCustomExtractionConfig = {
  instructions: 'Extract runbook steps the team agreed on.',
  types: [
    {
      type: 'runbook_step',
      description: 'One agreed step of a runbook.',
      attributes: {
        order: { type: 'number', description: 'Position in the runbook.' },
        tools: { type: 'array', items: { type: 'string' } },
        severity: { type: 'string', enum: ['low', 'high'] },
      },
    },
  ],
};

const baseValues = { aiIndexId: 'sre', agentIds: [], batchSize: 50, interval: '1h' };

interface Step {
  name: string;
  with?: Record<string, unknown>;
  steps?: Step[];
}

const findStep = (steps: Step[], name: string): Step | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    const nested = step.steps ? findStep(step.steps, name) : undefined;
    if (nested) return nested;
  }
  return undefined;
};

const render = (template: string, context: Record<string, unknown>) =>
  createWorkflowLiquidEngine().parseAndRenderSync(template, context);

/** What the `compile` and `compiled` steps produce at run time from the consts. */
const compileAtRunTime = (definition: { consts: Record<string, unknown>; steps: Step[] }) => {
  const compile = findStep(definition.steps, 'compile');
  const text = (key: string) => render(String(compile?.with?.[key]), { consts: definition.consts });
  return {
    node_kinds: JSON.parse(text('node_kinds_json')),
    relationship_kinds: JSON.parse(text('relationship_kinds_json')),
    schema: JSON.parse(text('schema_json')),
  };
};

/** The run-time context of a write step: the compiled consts plus the given step outputs. */
const writeContext = (
  definition: { consts: Record<string, unknown>; steps: Step[] },
  steps: Record<string, unknown>,
  item: Record<string, unknown>
) => ({
  consts: definition.consts,
  steps: { ...steps, compiled: { output: compileAtRunTime(definition) } },
  foreach: { item },
});

describe('compileMemoryExtractionConfig', () => {
  it('maps facts and entities to their KI types and shared id prefixes', () => {
    const { nodeKinds, relationshipKinds } = compileMemoryExtractionConfig(sreConfig);

    expect(nodeKinds).toEqual({
      incident: { ki_type: 'memory.fact.incident', id_prefix: 'memory/fact/incident/' },
      preference: { ki_type: 'memory.fact.preference', id_prefix: 'memory/fact/preference/' },
      service: { ki_type: 'memory.entity.service', id_prefix: 'memory/entity/service/' },
      person: { ki_type: 'memory.entity.person', id_prefix: 'memory/entity/person/' },
    });
    expect(relationshipKinds).toEqual({
      owned_by: { source: 'service', target: 'person' },
      caused_by: { source: 'incident', target: 'incident' },
    });
  });

  it('builds an output schema with the kinds as enums and the attributes as properties', () => {
    const schema = buildExtractionOutputSchema(compileMemoryExtractionConfig(sreConfig)) as {
      properties: Record<string, { items: { properties: Record<string, unknown> } }>;
    };
    const node = schema.properties.nodes.items.properties;

    expect(node.type).toEqual({
      type: 'string',
      enum: ['incident', 'preference', 'service', 'person'],
    });
    expect(node.attributes).toEqual({
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'service: The team that owns the service.' },
        tier: { type: 'string', description: 'service: Criticality tier, 1 to 3.' },
        role: { type: 'string', description: 'person: Their job role.' },
        team: { type: 'string', description: 'person: The team they belong to.' },
      },
    });
    expect(schema.properties.relationships.items.properties.type).toEqual({
      type: 'string',
      enum: ['owned_by', 'caused_by'],
    });
  });

  it('leaves relationships out of the schema when none are configured', () => {
    const schema = buildExtractionOutputSchema(
      compileMemoryExtractionConfig({ facts: sreConfig.facts })
    ) as { properties: Record<string, unknown> };

    expect(schema.properties).not.toHaveProperty('relationships');
  });

  it.each([
    [{}, /at least one fact or entity kind/],
    [{ facts: [{ type: 'Incident', description: 'x' }] }, /must start with a lowercase letter/],
    [
      {
        facts: [{ type: 'incident', description: 'x' }],
        entities: [{ type: 'incident', description: 'y' }],
      },
      /defined twice/,
    ],
    [
      {
        entities: [{ type: 'service', description: 'x' }],
        relationships: [{ type: 'owned_by', description: 'y', source: 'service', target: 'team' }],
      },
      /refers to "team"/,
    ],
  ])('rejects an invalid configuration %#', (config, message) => {
    expect(() => compileMemoryExtractionConfig(config as MemoryExtractionConfig)).toThrow(message);
  });

  it('bounds the configuration input', () => {
    expect(memoryExtractionConfigSchema.safeParse(sreConfig).success).toBe(true);
    expect(
      memoryExtractionConfigSchema.safeParse({ facts: [{ type: 'x', description: '' }] }).success
    ).toBe(false);
  });
});

describe('compileMemoryCustomExtractionConfig', () => {
  it('writes custom kinds as memory.<type> and keeps their attribute schemas', () => {
    const compiled = compileMemoryCustomExtractionConfig(customConfig);

    expect(compiled.nodeKinds).toEqual({
      runbook_step: { ki_type: 'memory.runbook_step', id_prefix: 'memory/runbook_step/' },
    });
    expect(compiled.attributes.tools).toEqual({
      type: 'array',
      items: { type: 'string' },
      description: 'runbook_step: tools',
    });
    expect(compiled.relationshipTypes).toEqual([]);
  });

  it('rejects a reserved type name and an attribute a KI cannot hold', () => {
    expect(() =>
      compileMemoryCustomExtractionConfig({
        instructions: 'x',
        types: [{ type: 'entity', description: 'x' }],
      })
    ).toThrow(/reserved/);
    expect(() =>
      compileMemoryCustomExtractionConfig({
        instructions: 'x',
        types: [
          {
            type: 'step',
            description: 'x',
            attributes: { nested: { type: 'object' } as never },
          },
        ],
      })
    ).toThrow(/string, number, boolean or array of strings/);
  });

  it('rejects one attribute name with two types', () => {
    expect(() =>
      compileMemoryCustomExtractionConfig({
        instructions: 'x',
        types: [
          { type: 'a', description: 'x', attributes: { level: { type: 'string' } } },
          { type: 'b', description: 'y', attributes: { level: { type: 'number' } } },
        ],
      })
    ).toThrow(/use one type or two names/);
  });
});

describe('memory extraction template', () => {
  it.each([
    [
      'memory_extraction',
      () => renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig }),
    ],
    [
      'memory_custom_extraction',
      () => renderMemoryCustomExtractionTemplate({ ...baseValues, config: customConfig }),
    ],
  ])('renders %s into a definition the workflow schema accepts', (_name, renderTemplate) => {
    const parsed = WorkflowSchema.safeParse(parse(renderTemplate()));

    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.issues, null, 2));
    }
    expect(() => convertToWorkflowGraph(parsed.data)).not.toThrow();
  });

  it('builds the kinds and output schema at run time, as the configuration compiles them', () => {
    const structured = parse(renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig }));
    const custom = parse(
      renderMemoryCustomExtractionTemplate({ ...baseValues, config: customConfig })
    );
    const structuredCompiled = compileMemoryExtractionConfig(sreConfig);
    const customCompiled = compileMemoryCustomExtractionConfig(customConfig);

    expect(compileAtRunTime(structured)).toEqual({
      node_kinds: structuredCompiled.nodeKinds,
      relationship_kinds: structuredCompiled.relationshipKinds,
      schema: buildExtractionOutputSchema(structuredCompiled),
    });
    expect(compileAtRunTime(custom)).toEqual({
      node_kinds: customCompiled.nodeKinds,
      relationship_kinds: {},
      schema: buildExtractionOutputSchema(customCompiled),
    });
  });

  it('stores only what was configured: no derived consts, and the schema comes from a step', () => {
    const definition = parse(renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig }));

    expect(Object.keys(definition.consts)).not.toContain('node_kinds');
    expect(Object.keys(definition.consts)).not.toContain('relationship_kinds');
    expect(findStep(definition.steps, 'extract')?.with?.schema).toBe(
      '${{ steps.compiled.output.schema }}'
    );
    expect(definition.settings.concurrency.key).toBe('memory-extraction-{{ consts.ai_index_id }}');
  });

  it('tags each variant and embeds the configuration', () => {
    const graph = parse(renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig }));
    const custom = parse(
      renderMemoryCustomExtractionTemplate({ ...baseValues, config: customConfig })
    );

    expect(graph.tags).toContain(AUTOMATION_TEMPLATE_TAGS.memory_extraction);
    expect(custom.tags).toContain(AUTOMATION_TEMPLATE_TAGS.memory_custom_extraction);
    expect(graph.consts.extraction_config).toEqual(sreConfig);
  });

  it('writes a node under its shared id with references to mentions and source memories', () => {
    const definition = parse(renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig }));
    const nodeStep = findStep(definition.steps, 'node');
    const context = writeContext(
      definition,
      { source_context: { output: { uri_prefix: 'stm://' } } },
      {
        type: 'service',
        key: 'Checkout Service',
        mentions: [{ type: 'person', key: 'jane-doe' }],
        source_ids: ['stm-1'],
      }
    );

    expect(render(String(nodeStep?.with?.ki_id), context)).toBe(
      'memory/entity/service/checkout-service'
    );
    expect(render(String(nodeStep?.with?.ki_type), context)).toBe('memory.entity.service');
    expect(JSON.parse(render(String(nodeStep?.with?.references_json), context))).toEqual([
      { uri: 'ki://memory/entity/person/jane-doe', relation: 'relates_to' },
      { uri: 'stm://stm-1', relation: 'derived_from' },
    ]);
  });

  it('allows only the configured source and target kinds for a relationship', () => {
    const definition = parse(renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig }));
    const relationshipStep = findStep(definition.steps, 'relationship');
    const allowed = (source: string, target: string) =>
      render(
        String(relationshipStep?.with?.allowed),
        writeContext(
          definition,
          {},
          { type: 'owned_by', source: { type: source }, target: { type: target } }
        )
      );

    expect(allowed('service', 'person')).toBe('true');
    expect(allowed('person', 'service')).toBe('false');
  });

  it('points a relationship at both ends', () => {
    const definition = parse(renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig }));
    const relationshipStep = findStep(definition.steps, 'relationship');

    expect(
      JSON.parse(
        render(
          String(relationshipStep?.with?.references_json),
          writeContext(
            definition,
            { source_context: { output: { uri_prefix: 'stm://' } } },
            {
              type: 'owned_by',
              source: { type: 'service', key: 'checkout-service' },
              target: { type: 'person', key: 'jane-doe' },
              source_ids: [],
            }
          )
        )
      )
    ).toEqual([
      { uri: 'ki://memory/entity/service/checkout-service', relation: 'relates_to' },
      { uri: 'ki://memory/entity/person/jane-doe', relation: 'relates_to' },
    ]);
  });
});

describe('toStoredSources', () => {
  it('stores each source as chosen, in snake_case, leaving defaults to the workflow', () => {
    expect(
      toStoredSources([
        { type: 'short_term_memory' },
        { type: 'query', query: '  FROM ai-index-idx-sre  ' },
        {
          type: 'query',
          query: 'FROM tickets',
          idColumn: 'ticket_id',
          uriPrefix: 'ticket://',
          excludeMemory: false,
          lookbackHours: 24,
          maxRecords: 50,
          description: 'support tickets',
        },
      ])
    ).toEqual([
      { type: 'short_term_memory' },
      { type: 'query', query: 'FROM ai-index-idx-sre' },
      {
        type: 'query',
        query: 'FROM tickets',
        id_column: 'ticket_id',
        uri_prefix: 'ticket://',
        exclude_memory: false,
        lookback_hours: 24,
        max_records: 50,
        description: 'support tickets',
      },
    ]);
  });

  it('rejects Liquid in a query and short-term memory twice', () => {
    expect(() =>
      toStoredSources([{ type: 'query', query: 'FROM x | WHERE a == "{{ y }}"' }])
    ).toThrow(/Liquid/);
    expect(() =>
      toStoredSources([{ type: 'short_term_memory' }, { type: 'short_term_memory' }])
    ).toThrow(/only once/);
  });

  it('bounds the sources input', () => {
    expect(extractionSourcesSchema.safeParse([]).success).toBe(false);
    expect(
      extractionSourcesSchema.safeParse([{ type: 'query', query: 'FROM x', uriPrefix: 'x' }])
        .success
    ).toBe(false);
  });
});

describe('memory extraction template with query sources', () => {
  const sources = [
    { type: 'short_term_memory' as const },
    { type: 'query' as const, query: 'FROM traces-agent_builder.otel-default', lookbackHours: 24 },
  ];

  it('renders into a definition the workflow schema accepts', () => {
    const parsed = WorkflowSchema.safeParse(
      parse(renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig, sources }))
    );

    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.issues, null, 2));
    }
    expect(() => convertToWorkflowGraph(parsed.data)).not.toThrow();
    expect(parsed.data.consts?.sources).toHaveLength(2);
  });

  it('reads the records of the step matching the source type', () => {
    const definition = parse(
      renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig, sources })
    );
    const recordsStep = findStep(definition.steps, 'records');
    const steps = {
      list_pending: { output: { memories: [{ id: 'stm-1' }] } },
      read_query: { output: { rows: [{ trace_id: 't-1' }, { trace_id: 't-2' }] } },
    };
    const renderRecords = (type: string) => ({
      json: render(String(recordsStep?.with?.records_json), {
        consts: definition.consts,
        steps,
        foreach: { item: { type } },
      }),
      count: render(String(recordsStep?.with?.count), {
        consts: definition.consts,
        steps,
        foreach: { item: { type } },
      }),
    });

    expect(renderRecords('short_term_memory')).toEqual({ json: '[{"id":"stm-1"}]', count: '1' });
    expect(renderRecords('query')).toEqual({
      json: '[{"trace_id":"t-1"},{"trace_id":"t-2"}]',
      count: '2',
    });
  });

  it.each([
    [
      'short-term memory',
      { type: 'short_term_memory' },
      { id_column: 'id', uri_prefix: 'stm://', query: '' },
    ],
    [
      'an AI index query, leaving memory out',
      { type: 'query', query: 'FROM ai-index-idx-sre | WHERE type == "incident"' },
      {
        description: 'knowledge indicators',
        id_column: 'id',
        uri_prefix: 'ki://',
        query:
          'FROM ai-index-idx-sre | WHERE type == "incident" | WHERE type IS NULL OR type NOT LIKE "memory.*"',
      },
    ],
    [
      'a trace query with a window',
      { type: 'query', query: 'FROM traces-agent_builder.otel-default', lookback_hours: 24 },
      {
        description: 'agent traces',
        id_column: 'trace_id',
        uri_prefix: 'trace://',
        query: 'FROM traces-agent_builder.otel-default | WHERE @timestamp >= NOW() - 24 hours',
      },
    ],
    [
      'explicit settings',
      {
        type: 'query',
        query: 'FROM ai-index-idx-sre',
        id_column: 'ticket_id',
        uri_prefix: 'ticket://',
        exclude_memory: false,
        description: 'support tickets',
      },
      {
        description: 'support tickets',
        id_column: 'ticket_id',
        uri_prefix: 'ticket://',
        query: 'FROM ai-index-idx-sre',
      },
    ],
  ])('applies the defaults of %s at run time', (_name, item, expected) => {
    const definition = parse(
      renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig, sources })
    );
    const sourceContext = findStep(definition.steps, 'source_context');
    const rendered = Object.fromEntries(
      Object.keys(expected).map((key) => [
        key,
        render(String(sourceContext?.with?.[key]), {
          consts: definition.consts,
          foreach: { item },
        }),
      ])
    );

    expect(rendered).toEqual(expected);
  });

  it('cites a query record with its source prefix', () => {
    const definition = parse(
      renderMemoryExtractionTemplate({ ...baseValues, config: sreConfig, sources })
    );
    const nodeStep = findStep(definition.steps, 'node');

    expect(
      JSON.parse(
        render(
          String(nodeStep?.with?.references_json),
          writeContext(
            definition,
            { source_context: { output: { uri_prefix: 'trace://' } } },
            { type: 'incident', key: 'outage', mentions: [], source_ids: ['t-1'] }
          )
        )
      )
    ).toEqual([{ uri: 'trace://t-1', relation: 'derived_from' }]);
  });
});
