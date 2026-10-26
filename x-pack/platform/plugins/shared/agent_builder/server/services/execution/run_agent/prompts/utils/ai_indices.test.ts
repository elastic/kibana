/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexCatalogEntry } from '../../types';
import { getAiIndicesInstructions } from './ai_indices';

const defaultCatalog: AiIndexCatalogEntry[] = [
  {
    id: 'elastic',
    esqlTarget: 'sml-main',
    description: 'Summaries of Kibana resources such as dashboards and connectors.',
  },
];

const render = (overrides: Partial<Parameters<typeof getAiIndicesInstructions>[0]> = {}) =>
  getAiIndicesInstructions({
    enabled: true,
    catalog: defaultCatalog,
    spaceId: 'default',
    ...overrides,
  });

describe('getAiIndicesInstructions', () => {
  it('renders nothing when AI Index instructions are disabled', () => {
    expect(render({ enabled: false })).toBe('');
  });

  it('renders nothing for an agent with an empty catalog', () => {
    expect(render({ catalog: [] })).toBe('');
  });

  it('explains what an AI Index is and how it is named', () => {
    const instructions = render();

    expect(instructions).toContain('## AI INDICES');
    expect(instructions).toContain('`ai-index-idx-*`');
    expect(instructions).toContain('`ai-index-ds-*`');
  });

  it('describes KIs as context that may answer directly or lead to another source', () => {
    const instructions = render();

    expect(instructions).toContain('may answer a question directly');
    expect(instructions).toContain('help locate and use another source');
  });

  it('continues with other relevant sources when KIs do not cover the question', () => {
    const instructions = render();

    expect(instructions).toContain('Search relevant AI Indices before broader retrieval');
    expect(instructions).toContain('continue with other relevant data or tools');
  });

  it('renders each catalog entry with its registry ID, ES|QL target, and description', () => {
    const instructions = render();

    expect(instructions).toContain('Available to this agent:');
    expect(instructions).toContain(
      '- Registry ID: `elastic`; ES|QL target: sml-main — Summaries of Kibana resources such as dashboards and connectors.'
    );
  });

  it('renders every catalog entry, including custom AI Indices', () => {
    const instructions = render({
      catalog: [
        ...defaultCatalog,
        { id: 'my-custom', esqlTarget: 'ai-index-idx-custom', description: 'Support tickets.' },
      ],
    });

    expect(instructions).toContain('- Registry ID: `elastic`; ES|QL target: sml-main');
    expect(instructions).toContain(
      '- Registry ID: `my-custom`; ES|QL target: ai-index-idx-custom — Support tickets.'
    );
  });

  it('omits entries with no ES|QL target from the available list, keeping the resolved ones', () => {
    const instructions = render({ catalog: [...defaultCatalog, { id: 'unresolved-custom' }] });

    expect(instructions).toContain('Available to this agent:');
    expect(instructions).toContain('- Registry ID: `elastic`; ES|QL target: sml-main');
    expect(instructions).not.toContain('unresolved-custom');
  });

  it('renders the section without an available list when no entry resolved to a target', () => {
    const instructions = render({ catalog: [{ id: 'unresolved-custom' }] });

    expect(instructions).toContain('## AI INDICES');
    expect(instructions).toContain('`ki-retrieval`');
    expect(instructions).not.toContain('Available to this agent:');
    expect(instructions).not.toContain('unresolved-custom');
  });

  it('renders both identifiers for an entry without a description', () => {
    const instructions = render({ catalog: [{ id: 'bare-id', esqlTarget: 'bare-target' }] });

    expect(instructions).toContain('- Registry ID: `bare-id`; ES|QL target: bare-target');
    expect(instructions).not.toContain('bare-target —');
  });

  it('points at the ki-retrieval skill by name, leaving the path to the SKILLS section', () => {
    const instructions = render();

    expect(instructions).toContain('Load the `ki-retrieval` skill before');
    expect(instructions).toContain('carries the AI Index tools');
    expect(instructions).not.toContain('/skills/');
  });

  it('leaves the list/describe/query guidance to the skill', () => {
    const instructions = render();

    expect(instructions).not.toContain('list_ai_indices');
    expect(instructions).not.toContain('describe_ai_index');
    expect(instructions).not.toContain('query_ai_indices');
    expect(instructions).not.toContain('sml_');
  });

  it("routes everything other than AI Indices to the agent's other data tools", () => {
    const instructions = render();

    expect(instructions).toContain('Query everything else');
    expect(instructions).toContain('including a source a KI points you to');
    expect(instructions).toContain('`generate_esql`');
    expect(instructions).toContain('`execute_esql`');
  });

  it('names the space the conversation runs in', () => {
    const instructions = render({ spaceId: 'marketing' });

    expect(instructions).toContain('This conversation runs in the space `marketing`');
  });

  it('carries no space filter for the agent to copy', () => {
    const instructions = render({ spaceId: 'marketing' });

    expect(instructions).not.toContain('permissions.kibana.privileges');
    expect(instructions).not.toContain('"filter"');
    expect(instructions).not.toContain('ignore_unmapped');
    expect(instructions).not.toContain('verbatim');
  });
});
