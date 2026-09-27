/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';
import { parse as parseYaml } from 'yaml';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { contextEngineAiIndexTools, platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import {
  KI_SHAPES_REFERENCE_NAME,
  STRATEGY_CATALOG_REFERENCE_NAME,
  kiShapesReference,
} from '../context_engine_shared';
import { contextEngineSkillAvailability } from '../context_engine_skill_availability';
import {
  aiIndexAutomationsSkill,
  DOCUMENT_TEMPLATE_NAME,
  INDEX_METADATA_TEMPLATE_NAME,
  TARGETED_KI_WRITER_TEMPLATE_NAME,
  UNIT_PROFILE_TEMPLATE_NAME,
} from './ai_index_automations_skill';

const TEMPLATE_NAMES: readonly string[] = [
  INDEX_METADATA_TEMPLATE_NAME,
  UNIT_PROFILE_TEMPLATE_NAME,
  DOCUMENT_TEMPLATE_NAME,
  TARGETED_KI_WRITER_TEMPLATE_NAME,
];

const templates = () =>
  (aiIndexAutomationsSkill.referencedContent ?? []).filter(({ name }) =>
    TEMPLATE_NAMES.includes(name)
  );

interface WorkflowStep {
  name?: string;
  type?: string;
  with?: Record<string, unknown>;
  steps?: WorkflowStep[];
  else?: WorkflowStep[];
}

interface ParsedTemplate {
  consts?: Record<string, unknown>;
  steps?: WorkflowStep[];
}

interface TemplateKi {
  attributes?: Record<string, unknown>;
  references?: unknown;
}

const parsedTemplate = (name: string): ParsedTemplate => {
  const reference = templates().find((template) => template.name === name);
  if (!reference) {
    throw new Error(`template ${name} is not attached to the skill`);
  }
  return parseYaml(reference.content) as ParsedTemplate;
};

const allSteps = (steps: WorkflowStep[] = []): WorkflowStep[] =>
  steps.flatMap((step) => [step, ...allSteps(step.steps), ...allSteps(step.else)]);

const stepNamed = (template: ParsedTemplate, name: string): WorkflowStep => {
  const step = allSteps(template.steps).find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`step ${name} not found`);
  }
  return step;
};

// The document each template verifies and writes: the `assemble_ki` step in the three generated
// templates, and every `kis[].ki` const in the targeted writer.
const assembledKis = (name: string): TemplateKi[] => {
  const template = parsedTemplate(name);
  if (name === TARGETED_KI_WRITER_TEMPLATE_NAME) {
    const kis = (template.consts?.kis ?? []) as Array<{ ki: TemplateKi }>;
    return kis.map(({ ki }) => ki);
  }
  return [stepNamed(template, 'assemble_ki').with?.ki as TemplateKi];
};

interface KiReference {
  uri: string;
  relation?: string;
}

const referenceUris = (ki: TemplateKi): string[] =>
  (ki.references as KiReference[]).map(({ uri }) => uri);

// Splits a template into its `ai.prompt` step blocks: from the step's `- name:` line to the next
// sibling `- name:` at the same indentation, so a rule about every prompt can be checked per step.
const aiPromptBlocks = (yaml: string): string[] => {
  const lines = yaml.split('\n');
  const blocks: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const nameMatch = lines[index].match(/^(\s*)- name: /);
    if (!nameMatch || !/^\s*type: ai\.prompt\s*$/.test(lines[index + 1] ?? '')) {
      continue;
    }
    const indent = nameMatch[1];
    let end = index + 1;
    while (end < lines.length && !lines[end].startsWith(`${indent}- name: `)) {
      end++;
    }
    blocks.push(lines.slice(index, end).join('\n'));
  }
  return blocks;
};

describe('aiIndexAutomationsSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(aiIndexAutomationsSkill.id).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.name).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(aiIndexAutomationsSkill.id)).toBe(true);
  });

  it('is gated behind experimental features and Context Engine availability', () => {
    expect(aiIndexAutomationsSkill.experimental).toBe(true);
    expect(aiIndexAutomationsSkill.availability).toBe(contextEngineSkillAvailability);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof aiIndexAutomationsSkill.content).toBe('string');
    expect(aiIndexAutomationsSkill.content.length).toBeGreaterThan(0);
  });

  it('carries one workflow template per strategy that ships with one, plus the shared references', () => {
    const names = (aiIndexAutomationsSkill.referencedContent ?? []).map(({ name }) => name);

    expect(names).toEqual([
      'index-metadata-template',
      'unit-profile-template',
      'document-template',
      'targeted-ki-writer',
      KI_SHAPES_REFERENCE_NAME,
      STRATEGY_CATALOG_REFERENCE_NAME,
    ]);
  });

  it('ships each template as a complete workflow rather than a fragment', () => {
    for (const reference of templates()) {
      expect(reference.relativePath).toBe('.');
      // A template is only a starting point if it runs: it needs the sink, the gate that guards
      // it, and the `consts` block that is the whole of the adaptation.
      expect(reference.content).toContain('consts:');
      expect(reference.content).toContain('ai_index_id');
      expect(reference.content).toContain('context-engine.createKi');
      expect(reference.content).toContain('verifiers:');
      expect(reference.content).toContain('esql-valid-runtime');
    }
  });

  it('routes ai.prompt via the context-engine-prompt feature rather than a literal connector', () => {
    const blocks = templates().flatMap(({ content: yaml }) => aiPromptBlocks(yaml));

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain('connector-id-by-feature: context_engine_prompt');
      expect(block).not.toMatch(/connector-id: /);
    }
    // The feature ref belongs on the prompt steps only; nothing else in a template names one.
    for (const reference of templates()) {
      const pinned = reference.content.match(/connector-id-by-feature:/g) ?? [];
      expect(pinned).toHaveLength(aiPromptBlocks(reference.content).length);
    }
  });

  it('retries every ai.prompt, since a transient model failure otherwise costs the unit', () => {
    const blocks = templates().flatMap(({ content: yaml }) => aiPromptBlocks(yaml));

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toMatch(/on-failure:\n\s+retry:\n\s+max-attempts: 3/);
      expect(block).toMatch(/strategy: exponential/);
      expect(block).toMatch(/jitter: true/);
    }
  });

  it('lets access_patterns be empty and omits attributes.esql when it is, so the verifiers skip rather than fail', () => {
    const modelDriven = templates().filter(({ name }) => name !== TARGETED_KI_WRITER_TEMPLATE_NAME);
    expect(modelDriven).toHaveLength(3);

    for (const { content: yaml } of modelDriven) {
      // No minimum on the prompt's access_patterns array: an invented query is worse than none.
      const accessPatternsSchema = yaml.match(/access_patterns:\n\s+type: array\n(\s+)(\w+):/);
      expect(accessPatternsSchema?.[2]).toBe('items');
      expect(yaml).toMatch(/Return\s+an\s+empty\s+array\s+rather\s+than\s+an\s+invented\s+query/);
      // `default: nil` turns an empty list into null, which the createKi schema drops.
      expect(yaml).toMatch(/esql: "\$\{\{ [^"]*\| map: 'esql_example' \| default: nil \}\}"/);
      // The content block says so too, instead of rendering an empty heading.
      expect(yaml).toMatch(/access_patterns\.size > 0/);
    }
  });

  it('tells targeted-ki-writer authors to leave the esql key out for a KI with no query', () => {
    const targeted = templates().find(({ name }) => name === TARGETED_KI_WRITER_TEMPLATE_NAME);

    expect(targeted?.content).toMatch(/leaves the `esql` key out entirely/);
    expect(targeted?.content).toMatch(/never an empty list/);
  });

  it('documents the null-omits-attribute contract for attributes.esql in the step contract', () => {
    expect(aiIndexAutomationsSkill.content).toMatch(/A\s+`null` value omits the attribute/);
    expect(aiIndexAutomationsSkill.content).toMatch(/default: nil/);
    expect(aiIndexAutomationsSkill.content).toMatch(
      /verifiers skip an indicator without it\.\s+Never write an empty list or an empty string there/
    );
  });

  it('pages the unit template on a cursor', () => {
    const unitTemplate = templates().find(({ name }) => name === UNIT_PROFILE_TEMPLATE_NAME);

    expect(unitTemplate?.content).toContain('type: while');
    expect(unitTemplate?.content).toMatch(/variables\.cursor/);
    expect(unitTemplate?.content).toMatch(/\| last \| first/);
    // The three strategy answers as consts.
    for (const constName of [
      'unit_index:',
      'unit_key:',
      'activity_field:',
      'catalog_index:',
      'discovery_filter:',
      'batch_size:',
    ]) {
      expect(unitTemplate?.content).toContain(constName);
    }
  });

  it('writes targeted KIs without a model call, from consts', () => {
    const writer = templates().find(({ name }) => name === TARGETED_KI_WRITER_TEMPLATE_NAME);

    expect(writer?.content).not.toContain('ai.prompt');
    expect(writer?.content).toContain('type: constraint');
    expect(writer?.content).toMatch(/ki: "\$\{\{ foreach\.item\.ki \}\}"/);
  });

  describe('unit template re-runs', () => {
    const template = () => parsedTemplate(UNIT_PROFILE_TEMPLATE_NAME);
    const stepNames = () => allSteps(template().steps).map(({ name }) => name);
    const unitTemplateYaml = () =>
      templates().find(({ name }) => name === UNIT_PROFILE_TEMPLATE_NAME)?.content ?? '';

    it('profiles every unit on every run, with no gate that skips one', () => {
      for (const removed of [
        'fingerprint_input',
        'source_fingerprint',
        'read_existing_ki',
        'freshness',
        'skip_unchanged_unit',
      ]) {
        expect(stepNames()).not.toContain(removed);
      }
      expect(allSteps(template().steps).map(({ type }) => type)).not.toContain('loop.continue');
      expect(unitTemplateYaml()).not.toMatch(/freshness|fingerprint|loop\.continue/);
    });

    it('carries no const or attribute that only a freshness check would read', () => {
      const [ki] = assembledKis(UNIT_PROFILE_TEMPLATE_NAME);

      for (const removed of ['profile_version', 'destination_index', 'freshness_field']) {
        expect(template().consts).not.toHaveProperty(removed);
      }
      expect(ki.attributes).not.toHaveProperty('source_fingerprint');
    });

    it('carries the activity range in the text only, not as a separate attribute', () => {
      const [ki] = assembledKis(UNIT_PROFILE_TEMPLATE_NAME);
      const discovery = stepNamed(template(), 'discover_units').with?.query as string;
      const unitContext = stepNamed(template(), 'unit_context').with ?? {};

      expect(ki.attributes).not.toHaveProperty('source_updated_at');
      expect(unitContext).not.toHaveProperty('unit_last_seen');
      // Discovery only lists units; the range comes from `unit_totals`.
      expect(discovery).not.toContain('activity_field');
      expect(unitTemplateYaml()).toMatch(
        /Active from \{\{ steps\.unit_metrics\.output\.first_seen \}\} to \{\{ steps\.unit_metrics\.output\.last_seen \}\}/
      );
    });

    it('keys each KI on the raw unit key, so keys that differ only in case or punctuation stay apart', async () => {
      const kiId = stepNamed(template(), 'unit_context').with?.ki_id as string;
      const keys = ['ABC', 'abc', 'A B', 'a-b', 'a_b'];
      const ids = await Promise.all(
        keys.map((key) => new Liquid().parseAndRender(kiId, { foreach: { item: [key] } }))
      );

      expect(kiId).toBe('unit-{{ foreach.item[0] }}');
      expect(new Set(ids).size).toBe(keys.length);
    });

    it('says a re-run regenerates every unit and replaces its KI by ki_id', () => {
      expect(unitTemplateYaml()).toMatch(/A re-run regenerates every unit/);
      expect(unitTemplateYaml()).toMatch(/`ki_id` is derived from the unit/);
    });

    it('reads the catalog record with the other grounding queries, right before the prompt', () => {
      const order = stepNames();

      expect(order.indexOf('unit_breakdown')).toBeLessThan(order.indexOf('catalog_record'));
      expect(order.indexOf('catalog_record')).toBe(order.indexOf('profile_unit') - 1);
      expect(unitTemplateYaml()).toMatch(/# Grounding 3: the unit's own record/);
    });

    it('lists units in discovery and leaves the counting to unit_totals', () => {
      const discovery = stepNamed(template(), 'discover_units').with?.query as string;

      expect(discovery).toMatch(/\| STATS BY \{\{ consts\.unit_key \}\}/);
      expect(discovery).toMatch(/\| KEEP \{\{ consts\.unit_key \}\}\s*$/);
    });
  });

  describe('no dead fields in the templates', () => {
    interface PromptSchema {
      properties: Record<string, { items?: { properties?: object; required?: string[] } }>;
    }

    const withoutComments = (yaml: string): string => yaml.replace(/^\s*#.*$/gm, '');
    const promptSteps = (name: string): WorkflowStep[] =>
      allSteps(parsedTemplate(name).steps).filter(({ type }) => type === 'ai.prompt');

    it('reads every const it declares', () => {
      for (const { name, content: yaml } of templates()) {
        const body = withoutComments(yaml);
        for (const key of Object.keys(parsedTemplate(name).consts ?? {})) {
          const read = new RegExp(`consts\\.${key}\\b`).test(body);
          expect({ name, key, read }).toEqual({ name, key, read: true });
        }
      }
    });

    it('reads every value a data.set step writes', () => {
      for (const { name, content: yaml } of templates()) {
        const body = withoutComments(yaml);
        for (const step of allSteps(parsedTemplate(name).steps)) {
          if (step.type !== 'data.set') {
            continue;
          }
          for (const key of Object.keys(step.with ?? {})) {
            const output = `${step.name}.${key}`;
            const read = new RegExp(
              `steps\\.${step.name}\\.output\\.${key}\\b|variables\\.${key}\\b`
            ).test(body);
            expect({ name, output, read }).toEqual({ name, output, read: true });
          }
        }
      }
    });

    it('puts every top-level field it asks the model for into the KI', () => {
      for (const { name, content: yaml } of templates()) {
        for (const step of promptSteps(name)) {
          const { properties } = step.with?.schema as PromptSchema;
          for (const field of Object.keys(properties)) {
            const read = yaml.includes(`steps.${step.name}.output.content.${field}`);
            expect({ name, field, read }).toEqual({ name, field, read: true });
          }
        }
      }
    });

    it('asks each access pattern only for what the KI renders or verifies', () => {
      const rendered = ['question_type', 'esql_template', 'esql_example', 'returns'];

      for (const { name, content: yaml } of templates()) {
        for (const step of promptSteps(name)) {
          const { items } = (step.with?.schema as PromptSchema).properties.access_patterns;
          expect({ name, fields: Object.keys(items?.properties ?? {}) }).toEqual({
            name,
            fields: rendered,
          });
          expect({ name, required: items?.required }).toEqual({ name, required: rendered });
          expect(yaml).not.toMatch(/^\s*- params:/m);
        }
      }
    });

    it('writes every attribute ki_shapes documents', () => {
      const documented = [
        ...new Set(
          [...kiShapesReference.content.matchAll(/`attributes\.([a-z_]+)`/g)].map(([, key]) => key)
        ),
      ];
      const written = new Set(
        TEMPLATE_NAMES.flatMap((name) =>
          assembledKis(name).flatMap(({ attributes }) => Object.keys(attributes ?? {}))
        )
      );

      expect(documented.length).toBeGreaterThan(0);
      expect(documented.filter((key) => !written.has(key))).toEqual([]);
    });
  });

  it('escapes a unit key for ES|QL in the per-unit queries and in the pagination cursor', async () => {
    const template = parsedTemplate(UNIT_PROFILE_TEMPLATE_NAME);
    const discovery = stepNamed(template, 'discover_units').with?.query as string;
    const unitEscaped = stepNamed(template, 'unit_context').with?.unit_escaped as string;
    // LiquidJS reads backslash escapes inside string literals, so a filter argument written as
    // '\"' is a bare quote and the replace does nothing. Render for real to catch that.
    const liquid = new Liquid();
    const key = 'Contoso "Pro" 15\\in';
    const esqlLiteral = 'Contoso \\"Pro\\" 15\\\\in';

    const escapedUnit = await liquid.parseAndRender(unitEscaped, { foreach: { item: [key] } });
    const rendered = await liquid.parseAndRender(discovery, {
      consts: { unit_index: 'sales', unit_key: 'ProductKey' },
      variables: { cursor: key },
    });

    expect(escapedUnit).toBe(esqlLiteral);
    // A raw quote in the cursor would end the string literal and break every page after it.
    expect(rendered).toContain(`ProductKey > "${esqlLiteral}"`);
  });

  it('documents the escape as LiquidJS reads it, with backslashes escaped first', () => {
    const { content } = aiIndexAutomationsSkill;

    expect(content).not.toContain(`| \`replace: '"', '\\"'\` |`);
    expect(content).toContain(`\`replace: '\\\\', '\\\\\\\\' | replace: '"', '\\\\"'\``);
    expect(content).toMatch(/LiquidJS reads backslash escapes inside a quoted argument/);
  });

  describe('KI provenance in the templates', () => {
    // Id-like provenance moved to top-level `references`; `expires_at` is top-level too.
    const MOVED_ATTRIBUTES = [
      'source_index',
      'source_doc_id',
      'trace_ids',
      'conversation_id',
      'expires_at',
    ];
    const REFERENCE_URI = /^(index|doc|trace|conversation):\/\//;

    it('keeps id-like provenance and expiry out of attributes in every template', () => {
      for (const name of TEMPLATE_NAMES) {
        for (const ki of assembledKis(name)) {
          for (const key of MOVED_ATTRIBUTES) {
            expect({ name, key, present: key in (ki.attributes ?? {}) }).toEqual({
              name,
              key,
              present: false,
            });
          }
        }
      }
    });

    it('writes each literal reference as a derived_from URI in one of the four schemes', () => {
      for (const name of [
        INDEX_METADATA_TEMPLATE_NAME,
        DOCUMENT_TEMPLATE_NAME,
        TARGETED_KI_WRITER_TEMPLATE_NAME,
      ]) {
        for (const ki of assembledKis(name)) {
          expect(Array.isArray(ki.references)).toBe(true);
          for (const reference of ki.references as KiReference[]) {
            expect(reference.uri).toMatch(REFERENCE_URI);
            expect(reference.relation).toBe('derived_from');
          }
        }
      }
    });

    it('references the profiled index from the index metadata template', () => {
      const [ki] = assembledKis(INDEX_METADATA_TEMPLATE_NAME);

      expect(referenceUris(ki)).toEqual(['index://{{ consts.source_index }}']);
    });

    it('references the source index and document from the document template', () => {
      const [ki] = assembledKis(DOCUMENT_TEMPLATE_NAME);

      expect(referenceUris(ki)).toEqual([
        'index://{{ consts.source_index }}',
        'doc://{{ consts.source_index }}/{{ steps.document_context.output.doc_id }}',
      ]);
    });

    it('references the unit index, and the catalog index only when it is a separate index', async () => {
      const template = parsedTemplate(UNIT_PROFILE_TEMPLATE_NAME);
      const [ki] = assembledKis(UNIT_PROFILE_TEMPLATE_NAME);
      const source = stepNamed(template, 'unit_context').with?.references;

      expect(ki.references).toBe('${{ steps.unit_context.output.references | json_parse }}');
      expect(typeof source).toBe('string');

      const render = async (consts: Record<string, string>): Promise<KiReference[]> =>
        JSON.parse(await new Liquid().parseAndRender(source as string, { consts }));

      expect(await render({ unit_index: 'sales', catalog_index: 'products' })).toEqual([
        { uri: 'index://sales', relation: 'derived_from' },
        { uri: 'index://products', relation: 'derived_from' },
      ]);
      expect(await render({ unit_index: 'sales', catalog_index: 'sales' })).toEqual([
        { uri: 'index://sales', relation: 'derived_from' },
      ]);
    });

    it('references the traces, conversation and index behind a targeted KI', () => {
      const [ki] = assembledKis(TARGETED_KI_WRITER_TEMPLATE_NAME);
      const uris = referenceUris(ki);

      expect(uris.some((uri) => uri.startsWith('trace://'))).toBe(true);
      expect(uris.some((uri) => uri.startsWith('conversation://'))).toBe(true);
      expect(uris).toContain('index://my-source-index');
      // Values that are not identifiers stay in attributes.
      expect(ki.attributes).toHaveProperty('error_text');
      expect(ki.attributes).toHaveProperty('prevalence');
    });

    it('no longer tells a data-stream destination to omit ki_id', () => {
      for (const reference of templates()) {
        expect(reference.content).not.toMatch(/which\s+(#\s+)?rejects it/);
      }
    });
  });

  it('mentions every referencedContent entry by name in the skill content', () => {
    for (const reference of aiIndexAutomationsSkill.referencedContent ?? []) {
      expect(aiIndexAutomationsSkill.content).toContain(reference.name);
    }
  });

  it('is the skill that carries the authoring and execution tools', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.executeWorkflow,
      platformCoreTools.getWorkflowExecutionStatus,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      contextEngineAiIndexTools.queryAiIndices,
      `${internalNamespaces.workflows}.validate_workflow`,
      `${internalNamespaces.workflows}.get_workflow`,
      `${internalNamespaces.workflows}.get_step_definitions`,
      `${internalNamespaces.workflows}.get_trigger_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.get_connectors`,
      `${internalNamespaces.workflows}.workflow_execute_step`,
    ]);
  });

  it('names every tool it binds, so none is bound without a use', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds.filter((id) => !aiIndexAutomationsSkill.content.includes(id))).toEqual([]);
  });

  it('binds no tool that writes a KI directly, since KIs come from automations', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds.some((id) => /createKi|updateKi|deleteKi/i.test(id))).toBe(false);
  });

  it('binds no workflow generator, and names it only to forbid it', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).not.toContain(platformCoreTools.generateWorkflow);

    // Unbinding it does not take it away — it is in `defaultAgentToolIds`, and `run_subagent`
    // gives a subagent the parent's configuration — so every mention has to be a prohibition.
    const mentions = aiIndexAutomationsSkill.content
      .split('\n')
      .filter((line) => line.includes('generate_workflow'));

    expect(mentions.length).toBeGreaterThan(0);
    expect(mentions.every((line) => /must not call|Do not generate/.test(line))).toBe(true);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    const referencedToolIds = [
      ...new Set(
        [
          ...aiIndexAutomationsSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map(([match]) => match)
      ),
    ];

    expect(referencedToolIds.length).toBeGreaterThan(0);
    // `generate_workflow` is the one tool named without being bound, because the skill's purpose
    // in naming it is to tell the agent not to call the one it already has.
    const shouldBeBound = referencedToolIds.filter(
      (toolId) => toolId !== platformCoreTools.generateWorkflow
    );

    expect(shouldBeBound.filter((toolId) => !boundTools.includes(toolId))).toEqual([]);
  });

  describe('content', () => {
    const { content } = aiIndexAutomationsSkill;

    it('requires reading an automation before making a claim about it', () => {
      expect(content).toContain('Read the automation before you say anything about it');
    });

    it('states the sink contract every automation has to satisfy', () => {
      expect(content).toContain('context-engine.verifyKi');
      expect(content).toContain('ki_id');
      expect(content).toContain('attributes.esql');
    });

    it('carries a workflow shape for every strategy the analysis skill can choose', () => {
      for (const strategy of [
        'Index/Table Metadata',
        'Bottom-Up',
        'Selective / Outlier',
        'Atomic Facts',
        'Cumulative / Wiki-style',
        'Detection / Feature',
      ]) {
        expect(content).toContain(strategy);
      }
    });

    it('requires the final untested edit to be validated, since no run covers it', () => {
      expect(content).toMatch(/Validate outright in one place: the last edit/);
      expect(content).toContain(`${internalNamespaces.workflows}.validate_workflow`);
    });

    it('starts authoring from a template rather than from a blank workflow', () => {
      expect(content).toMatch(/Start from the template\. Do not write a workflow/);
      expect(content).toMatch(/all take a raw\s+`yaml` string/);
    });

    it('names each template where its strategy is described, so the brief can cite one', () => {
      expect(content).toMatch(/Index\/Table Metadata.*\n?.*`index-metadata-template`/);
      expect(content).toMatch(/Bottom-Up.*\n?.*`document-template`/);
      expect(content).toMatch(/Cumulative \/ Wiki-style.*\n?.*`unit-profile-template`/);
      expect(content).toMatch(/Targeted KIs.*\n?.*`targeted-ki-writer`/);
      expect(content).not.toContain('entity-profile-template');
    });

    it('describes the unit template as the three strategy answers written into consts', () => {
      expect(content).toMatch(/`unit_index` and `unit_key` are the unit/);
      expect(content).toMatch(/how units are found and refreshed/);
      expect(content).toMatch(
        /the metrics, the `activity_field` range\s+and `catalog_index` are what one KI carries/
      );
      expect(content).toMatch(/`discovery_filter` and `batch_size` are how units are\s+found/);
      expect(content).toMatch(/A re-run\s+regenerates every unit/);
      expect(content).not.toMatch(/fingerprint|profile_version|freshness_field/);
    });

    it('has the brief carry the three strategy answers and the counted findings', () => {
      expect(content).toMatch(/\*\*as its three answers\*\*/);
      expect(content).toMatch(/\*\*the counted findings\*\*/);
      expect(content).toMatch(/what is not in the brief is not in the KI/i);
    });

    it('requires retry on every ai.prompt and says why', () => {
      expect(content).toMatch(/\*\*Retry every `ai\.prompt`\*\*/);
      expect(content).toMatch(/three attempts, exponential delay and\s+jitter/);
    });

    it('points at the shared references for the shape and the catalog instead of restating them', () => {
      expect(content).toContain(`\`${KI_SHAPES_REFERENCE_NAME}\``);
      expect(content).toContain(`\`${STRATEGY_CATALOG_REFERENCE_NAME}\``);
      expect(content).not.toMatch(/\| `title` \| text \+ semantic \|/);
    });

    it('documents while and variables, which the unit template depends on', () => {
      expect(content).toMatch(/\*\*A `while` pages through a corpus/);
      expect(content).toMatch(/readable as `variables\.<key>`/);
      // No template skips an iteration any more, so the skill no longer teaches it.
      expect(content).not.toContain('loop.continue');
    });

    it('never reruns a failed call unchanged', () => {
      expect(content).toMatch(/Never rerun a\s+failed call unchanged/);
    });

    it('points the strategies without a template at the one to start from', () => {
      expect(content).toMatch(/Selective \/ Outlier.*\n?.*start from `document-template`/);
      expect(content).toMatch(/Atomic Facts.*\n?.*start from `document-template`/);
      expect(content).toMatch(/Detection \/ Feature.*\n?.*start from `index-metadata-template`/);
    });

    it('says what a template already encodes, so it is edited rather than rewritten', () => {
      expect(content).toMatch(/a fresh draft gets\s+wrong/);
      expect(content).toMatch(/Take it literally/);
      expect(content).toMatch(/none of them announce themselves/);
    });

    it('has the brief name the template, since a subagent without one writes from nothing', () => {
      expect(content).toMatch(/\*\*the template it starts from, by name\*\*/);
      expect(content).toMatch(/rediscovering what the\s+template already encodes/);
    });

    it('points at the lookup tools that cover built-in and connector step types', () => {
      expect(content).toContain(`${internalNamespaces.workflows}.get_step_definitions`);
      expect(content).toContain(`${internalNamespaces.workflows}.get_trigger_definitions`);
      expect(content).toContain(`${internalNamespaces.workflows}.get_examples`);
    });

    it('offers single-step execution for isolating a failing step', () => {
      expect(content).toContain(`${internalNamespaces.workflows}.workflow_execute_step`);
      expect(content).toMatch(/runs that step alone out of the inline YAML/);
    });

    it('delegates the build-and-test loop rather than saving an unrun draft', () => {
      expect(content).toContain('delegate the build-and-test loop to a subagent');
      expect(content).toMatch(/A workflow that has never run is a guess/);
      expect(content).toMatch(/complete final YAML must come back verbatim/);
    });

    it('bounds the iteration, since the subagent shares the run step limit', () => {
      expect(content).toMatch(/at most five attempts/);
    });

    it('keeps the build subagent off the fast model', () => {
      expect(content).toMatch(/\*\*Never run the build subagent on `effort: low`\.\*\*/);
      expect(content).toMatch(/`low` routes the subagent to the fast model/);
      expect(content).toMatch(/Leave `effort` at its default\s+or set it higher/);
    });

    it('has the subagent bring back the pilot run time and unit count', () => {
      expect(content).toMatch(/together with the pilot's run time/);
      expect(content).toMatch(/`started_at` and `finished_at`/);
      expect(content).toMatch(
        /what the pilot cost: how many units it wrote and how long the\s+successful run took/
      );
    });

    it('states the full-run time estimate from the pilot before the save, as a floor', () => {
      expect(content).toMatch(
        /\*\*State the time estimate from the pilot in the same message\.\*\*/
      );
      expect(content).toMatch(/divide to get a per-unit time, and multiply by the\s+unit count/);
      expect(content).toMatch(/units, not rows/);
      expect(content).toMatch(/Say \*at least\*/);
      expect(content).toMatch(/Show the three numbers, not only the result/);
    });

    it('flags a projection over one hour in bold between siren markers', () => {
      expect(content).toMatch(
        /\*\*When the projection exceeds one hour, put the estimate in bold between 🚨 markers\*\*/
      );
      expect(content).toMatch(
        /"🚨 \*\*The full run over 2,517 units will take at least 11 hours\*\* 🚨"/
      );
      expect(content).toMatch(/Under an hour, write it in plain text/);
    });

    it('reports token usage only when the execution carries it', () => {
      expect(content).toMatch(/Report token usage only when the execution\s+result carries it/);
      expect(content).toMatch(/say the token count was not measured rather than estimating one/);
    });

    it('has the subagent load the skill by id rather than search for an id it was given', () => {
      expect(content).toMatch(/`load_skill` on `ai-index-automations`/);
      expect(content).toMatch(/do not reach for\s+`search_relevant_skills`/);
    });

    it('keeps the subagent off workflow-authoring, which teaches the flow this replaces', () => {
      expect(content).toMatch(/Do not load it to author one of these/);
      expect(content).toMatch(/do not send it to `workflow-authoring`/);
      expect(content).toMatch(/One skill is enough/);
    });

    it('forbids generation outright, since unbinding the tool cannot remove it', () => {
      expect(content).toMatch(/\*\*Do not generate a workflow\.\*\*/);
      expect(content).toMatch(/must not call `platform\.core\.generate_workflow`/);
    });

    it('does not claim every agent has generate_workflow, since the Context Engine agent does not', () => {
      expect(content).not.toMatch(/in every agent's default\s+toolset/);
      expect(content).toMatch(/the default agent has it; the Context\s+Engine agent does not/);
    });

    it('keeps the attachment read-only, against the generic guidance that offers an update', () => {
      expect(content).toMatch(/a handoff, not a workspace/);
      expect(content).toMatch(/do not try to write back to it with `attachment_update`/);
    });

    it('restates the rules in the brief, since a skill loaded late cannot govern earlier calls', () => {
      expect(content).toMatch(/restated in the prompt rather than left to the skill/);
      expect(content).toMatch(/cannot govern the first/);
    });

    it('points at the referenced-file path instead of browsing the filesystem', () => {
      expect(content).toMatch(/among its `referenced_files` with\s+absolute paths/);
      expect(content).toMatch(/nothing to go looking for with `list_files`/);
    });

    it('explains the five-match cliff that makes keyword step lookups useless', () => {
      expect(content).toMatch(/only when the query matches five types or fewer/);
      expect(content).toMatch(/Pass `stepType` with an exact id/);
    });

    it('names the closed set of step types, so lookups can be targeted', () => {
      for (const stepType of [
        '`elasticsearch.esql.query`',
        '`elasticsearch.search`',
        '`elasticsearch.request`',
        '`ai.prompt`',
        '`foreach`',
        '`while`',
        '`if`',
        '`data.set`',
        '`console`',
      ]) {
        expect(content).toContain(stepType);
      }
    });

    it('covers every step type the templates use, so none needs looking up', () => {
      const closedSet = [
        'elasticsearch.esql.query',
        'elasticsearch.search',
        'elasticsearch.request',
        'ai.prompt',
        'foreach',
        'while',
        'if',
        'data.set',
        'console',
        'context-engine.createKi',
        'context-engine.verifyKi',
      ];

      for (const reference of templates()) {
        // Anchored on the `- name:` above it, so the `type:` keys inside an ai.prompt output
        // schema are not mistaken for step types.
        const used = [...reference.content.matchAll(/- name: [^\n]+\n\s*type: ([\w.-]+)/g)].map(
          ([, stepType]) => stepType
        );

        expect(used.length).toBeGreaterThan(0);
        expect(used.filter((stepType) => !closedSet.includes(stepType))).toEqual([]);
      }
    });

    it('asks for one examples call rather than one per step', () => {
      expect(content).toMatch(/one call for the example library rather than one per step/);
    });

    it('routes ai.prompt through a named feature rather than a literal connector-id', () => {
      expect(content).toMatch(/`connector-id-by-feature`/);
      expect(content).toContain('context_engine_prompt');
      expect(content).toMatch(/Leave `connector-id`\s+off/);
    });

    it('says the templates use connector-id-by-feature deliberately, so no literal connector is added', () => {
      expect(content).toMatch(
        /connector-id-by-feature: context_engine_prompt.*on their `ai\.prompt` steps/s
      );
      expect(content).toMatch(/do not add a `connector-id`/);
    });

    it('requires ${{ }} for non-strings, since {{ }} stringifies objects and booleans', () => {
      expect(content).toMatch(/Anything that is not a string needs `\$\{\{ \}\}`, not `\{\{ \}\}`/);
      expect(content).toMatch(/`\[object Object\]`/);
      expect(content).toMatch(/the string `"false"`, which\s+is truthy/);
    });

    it('points ai.prompt references at output.content rather than the flat path', () => {
      expect(content).toMatch(/nested under `output\.content`/);
      expect(content).toMatch(/`steps\.<name>\.output\.content\.<field>`/);
      expect(content).toMatch(/never\s+`steps\.<name>\.output\.<field>`/);
    });

    it('explains that both mistakes survive validation, so drafting is the only place to catch them', () => {
      expect(content).toMatch(/Both of these parse, validate and run/);
    });

    it('expands tags before filtering, since == skips multivalued rows', () => {
      expect(content).toContain(
        `Query\nthe tag back with \`${contextEngineAiIndexTools.queryAiIndices}\``
      );
      expect(content).toMatch(/\| MV_EXPAND tags\n\| WHERE tags == "ce-pilot-<runId>"/);
      expect(content).toMatch(/`MV_EXPAND tags` is not optional/);
      expect(content).toMatch(/skips multivalued\s+rows outright/);
    });

    it('reads pilot output by KI id and shows its references, not the backing _id', () => {
      expect(content).toMatch(/\| KEEP id, title, type, content, attributes, references\n/);
      expect(content).not.toMatch(/FROM <destination> METADATA _id\n\| MV_EXPAND tags/);
    });

    it('cleans up by KI ids read through the space-scoped tool, never a raw backing-store query', () => {
      const prose = content.replace(/\s+/g, ' ');

      expect(prose).toContain('Read the ids first with `platform.context_engine.query_ai_indices`');
      expect(content).toMatch(/\| WHERE tags == "ce-pilot-<runId>"\n\| STATS BY id\n/);
      expect(prose).toContain(
        'a `foreach` over `consts.ki_ids` calling `context-engine.deleteKi` with `ki_id` set to each `id`'
      );
      expect(content).not.toMatch(/an `elasticsearch\.esql\.query` selecting `id`/);
    });

    it('confirms cleanup on the newest revision per id, since a data stream keeps deleted ones', () => {
      expect(content).toMatch(
        /\| INLINE STATS latest = MAX\(@timestamp\) BY id\n\| WHERE @timestamp == latest/
      );
      expect(content).toMatch(
        /\| WHERE governance\.lifecycle\.status IS NULL OR governance\.lifecycle\.status != "deleted"/
      );
      // Mapping only appears once something wrote the field, so the filter needs a way out.
      expect(content).toMatch(/unknown column, drop that line/);
    });

    it('warns that the unexpanded query looks like a pilot that wrote nothing', () => {
      expect(content).toMatch(/returns nothing at all — which reads exactly like a pilot/);
    });

    it('requires the pilot to tag its indicators and delete them afterwards', () => {
      expect(content).toContain('ce-pilot-');
      expect(content).toContain('context-engine.deleteKi');
      expect(content).toMatch(/cleanup is not optional/);
    });

    it('names the KI id as a second handle on pilot output, on either destination', () => {
      expect(content).not.toMatch(/refuses `ki_id`/);
      expect(content).toMatch(
        /on a data stream each write appends a revision under the\s+same `id`/
      );
    });

    it('puts the pilot tag where the templates build the indicator, not on the write step', () => {
      expect(content).toMatch(/tag goes on that step's `ki\.tags` list/);
      expect(content).toMatch(/not on\s+`context-engine\.createKi`/);
    });

    it('points the pilot bound at the consts the templates already expose', () => {
      expect(content).toMatch(
        /`max_documents`, `corpus_filter`, `discovery_filter`, and `batch_size`/
      );
    });

    it('saves the piloted definition rather than a regenerated one', () => {
      expect(content).toMatch(/Save the YAML exactly as the subagent returned it/);
    });

    it('does not pay for a validate call before a run that validates anyway', () => {
      expect(content).toMatch(/Do not validate and then run/);
      expect(content).toMatch(/parses and validates before a single step executes/);
    });

    it('says what a separate validate call adds over a failed run', () => {
      expect(content).toMatch(/warnings the execution path drops/);
      expect(content).toMatch(/definitions of every built-in and connector step type/);
    });

    it('writes out the context-engine step contracts, which no discovery tool can return', () => {
      expect(content).toContain('The `context-engine` step contracts');
      expect(content).toMatch(/no discovery tool can see them/);

      for (const stepType of [
        'context-engine.createKi',
        'context-engine.updateKi',
        'context-engine.deleteKi',
        'context-engine.verifyKi',
      ]) {
        expect(content).toContain(stepType);
      }
    });

    it('names both verifier ids, since an unknown id fails the step', () => {
      expect(content).toContain('esql-valid-syntax');
      expect(content).toContain('esql-valid-runtime');
    });

    it('states the createKi id rules that make a re-run idempotent, on both destinations', () => {
      expect(content).not.toMatch(/`ki_id` is rejected/);
      expect(content).toMatch(/On an index the same `ki_id` replaces the indicator/);
      expect(content).toMatch(/on a data stream it appends a new\s+revision/);
    });

    it('shows references and expires_at in the createKi contract, and what the step stamps', () => {
      expect(content).toMatch(/references: # optional, <= 100 entries/);
      expect(content).toMatch(/relation: 'derived_from'/);
      expect(content).toMatch(/expires_at: '[^']+' # optional/);
      expect(content).toMatch(
        /`id`, `updated_at` and `governance\.provenance` are stamped by the step; never supply them/
      );
    });

    it('describes deleteKi per destination, since a data stream keeps the deleted revision', () => {
      expect(content).toMatch(/On an index `deleteKi` removes the document/);
      expect(content).toMatch(
        /on a data stream it appends a revision with\s+`governance\.lifecycle\.status: deleted`/
      );
    });

    it('names the updateKi lifecycle and force inputs', () => {
      expect(content).toMatch(/`lifecycle: \{ status: active \| deleted \}`/);
      expect(content).toMatch(/`force: true`/);
    });

    it('allows custom verifier workflows while keeping the verifier list non-empty', () => {
      expect(content).toMatch(/`\{ workflow_id \}`/);
      expect(content).toMatch(/non-empty, duplicate-free `verifiers` list/);
    });

    it('asks the brief for the ids a targeted KI turns into references', () => {
      expect(content).toMatch(
        /the provenance ids \(`trace_ids`, `conversation_id`, the source index and document id\) that\s+become its `references`/
      );
    });

    it('bounds what a KI attribute can hold, since indicators carry ES|QL in one', () => {
      expect(content).toMatch(/never nested objects/);
      expect(content).toContain('10,000 characters');
    });

    it('says why updateKi is not interchangeable with createKi', () => {
      expect(content).toMatch(/It fails when the indicator does not\s+exist/);
      expect(content).toMatch(/not a substitute\s+for\s+`createKi`/);
    });

    it('names the check validation does not cover, since a valid draft can still match nothing', () => {
      expect(content).toMatch(/does \*\*not\*\* establish that a query inside it returns anything/);
      expect(content).toContain(platformCoreTools.executeEsql);
    });

    it('does not let piloting a workflow be read as licence to run the saved one', () => {
      expect(content).toContain('Running one is a separate decision');
      expect(content).toMatch(
        /do not\s+execute a saved\s+workflow unless the context in this conversation calls for it/
      );
    });

    it('carries the workflow syntax itself, rather than depending on another skill for it', () => {
      expect(content).toContain('The rest of the syntax these automations use');
      expect(content).toMatch(/An `if` condition is KQL, not Liquid/);
      expect(content).toContain('iteration-on-failure');
      expect(content).toContain('on-failure');
    });

    it('documents every Liquid filter the templates depend on', () => {
      const templateYaml = templates()
        .map(({ content: yaml }) => yaml)
        .join('\n');
      const used = new Set(
        [...templateYaml.matchAll(/\|\s*([a-z_]+)\s*(?::|\}\}|\|)/g)].map(([, filter]) => filter)
      );

      expect(used.size).toBeGreaterThan(0);
      expect([...used].filter((filter) => !content.includes(`\`${filter}`))).toEqual([]);
    });

    it('documents only filters a template uses', () => {
      const templateYaml = templates()
        .map(({ content: yaml }) => yaml)
        .join('\n');
      const table = content.slice(content.indexOf('| Filter | Use |')).split('\n\n')[0];
      const documented = table
        .split('\n')
        .slice(2)
        .flatMap((row) => [...row.split(' | ')[0].matchAll(/`([a-z_]+)/g)].map(([, name]) => name));

      expect(documented.length).toBeGreaterThan(0);
      expect(
        documented.filter((name) => !new RegExp(`\\|\\s*${name}\\b`).test(templateYaml))
      ).toEqual([]);
    });

    it('notes the ES|QL row cap, which otherwise truncates a large corpus silently', () => {
      expect(content).toContain('10,000');
    });

    it('points at the skills on either side of it', () => {
      expect(content).toContain('analyze-and-improve');
      expect(content).toContain('ai-index-sources');
    });
  });
});
