/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBuiltInEntityDefinition } from './registry';
import { entitySchema } from './entity_schema';
import { getEuidFromObject } from '../euid/memory';
import { getEuidEsqlDocumentsContainsIdFilter } from '../euid/esql';
import { applyWhenConditionTrueSetFields, resolveFieldValueSchema } from '../euid/commons';

const definition = getBuiltInEntityDefinition('ai_agent');

const agentEvent = (aiAgent: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({
  host: { id: 'host-1', name: 'dev-box' },
  user: { name: 'ec2-user' },
  process: { ai_agent: aiAgent },
  ...overrides,
});

describe('ai_agent entity definition', () => {
  it('is a valid definition', () => {
    expect(entitySchema.safeParse({ ...definition, id: 'ai_agent-default' }).success).toBe(true);
  });

  it('identifies one install per agent name, host and OS user', () => {
    expect(
      getEuidFromObject(definition, agentEvent({ name: 'claude_code', is_descendant: false }))
    ).toBe('ai_agent:claude_code@host-1@ec2-user');
  });

  it('ignores the signed-in email, so two accounts on one install are one agent', () => {
    const first = agentEvent({ name: 'claude_code', is_descendant: false, email: 'a@example.com' });
    const second = agentEvent({
      name: 'claude_code',
      is_descendant: false,
      email: 'b@example.com',
    });
    expect(getEuidFromObject(definition, first)).toBe(getEuidFromObject(definition, second));
  });

  it.each([
    ['boolean', false],
    ['string', 'false'],
  ])('admits the agent own events with a %s flag', (_, isDescendant) => {
    expect(
      getEuidFromObject(definition, agentEvent({ name: 'cursor', is_descendant: isDescendant }))
    ).toBe('ai_agent:cursor@host-1@ec2-user');
  });

  it.each([
    ['boolean', true],
    ['string', 'true'],
  ])("doesn't admit descendants with a %s flag", (_, isDescendant) => {
    expect(
      getEuidFromObject(definition, agentEvent({ name: 'cursor', is_descendant: isDescendant }))
    ).toBeUndefined();
  });

  it('admits events without is_descendant', () => {
    expect(getEuidFromObject(definition, agentEvent({ name: 'cursor' }))).toBe(
      'ai_agent:cursor@host-1@ec2-user'
    );
  });

  it("doesn't admit descendants, so a sudo child can't mint a root agent", () => {
    expect(
      getEuidFromObject(
        definition,
        agentEvent({ name: 'claude_code', is_descendant: true }, { user: { name: 'root' } })
      )
    ).toBeUndefined();
  });

  it.each([
    ['agent name', agentEvent({ is_descendant: false })],
    ['host.id', agentEvent({ name: 'claude_code' }, { host: { name: 'dev-box' } })],
    ['user.name', agentEvent({ name: 'claude_code' }, { user: {} })],
  ])('needs %s', (_, doc) => {
    expect(getEuidFromObject(definition, doc)).toBeUndefined();
  });

  it('filters descendants out in ES|QL, keeping events without the flag', () => {
    expect(getEuidEsqlDocumentsContainsIdFilter(definition)).toMatchSnapshot();
  });

  it('writes the host EUID to depends_on and the email to acts_on_behalf_of before STATS', () => {
    const doc = agentEvent({ name: 'claude_code', email: 'a@example.com' });
    applyWhenConditionTrueSetFields(
      doc,
      definition.extraction.whenConditionTrueSetFieldsPreAgg ?? []
    );
    expect(
      resolveFieldValueSchema(doc, { source: 'entity.relationships.depends_on.entity.id' })
    ).toBe('host:host-1');
    expect(
      resolveFieldValueSchema(doc, { source: 'entity.relationships.acts_on_behalf_of.user.email' })
    ).toBe('a@example.com');
    expect(getEuidFromObject(getBuiltInEntityDefinition('host'), doc)).toBe('host:host-1');
  });
});

describe('composition prefix', () => {
  it('puts the literal before the joined fields', () => {
    expect(
      resolveFieldValueSchema(
        { a: 'x', b: 'y' },
        { composition: { prefix: 'p:', fields: ['a', 'b'], sep: '@' } }
      )
    ).toBe('p:x@y');
  });

  it('is undefined when a field is missing', () => {
    expect(
      resolveFieldValueSchema(
        { a: 'x' },
        { composition: { prefix: 'p:', fields: ['a', 'b'], sep: '@' } }
      )
    ).toBeUndefined();
  });
});
