/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredMemoryDocument } from '../memory_document';
import { checkRelation, describeRelationRules, getRelationEnd } from './relation_rules';

const memory = (type: string, kind?: string) =>
  ({
    id: type,
    type,
    attributes: kind ? { 'entity.kind': kind } : {},
  } as StoredMemoryDocument);

const person = memory('memory.entity', 'person');
const team = memory('memory.entity', 'team');
const service = memory('memory.entity', 'service');
const fact = memory('memory.fact');
const procedure = memory('memory.procedure');

describe('getRelationEnd', () => {
  it('reads the entity kind, and treats an unknown kind as other', () => {
    expect(getRelationEnd(team)).toBe('team');
    expect(getRelationEnd(memory('memory.entity', 'planet'))).toBe('other');
    expect(getRelationEnd(fact)).toBe('fact');
    expect(getRelationEnd(memory('memory.relationship'))).toBeUndefined();
  });
});

describe('checkRelation', () => {
  it.each([
    ['member_of', person, team],
    ['owns', team, service],
    ['applies_to', procedure, service],
    ['about', fact, procedure],
  ])('allows %s', (relation, from, to) => {
    expect(checkRelation({ from, relation, to, description: '' })).toBeUndefined();
  });

  it.each([
    ['an unknown relation', 'manages', person, team, "'manages' is not an allowed relation"],
    ['a prototype key', 'constructor', person, team, "'constructor' is not an allowed relation"],
    [
      'ends the relation cannot join',
      'member_of',
      service,
      team,
      "'member_of' cannot link a service to a team",
    ],
    [
      'an end that is not an entity, fact or procedure',
      'related_to',
      memory('memory.relationship'),
      team,
      'an end is not an entity, fact or procedure',
    ],
  ])('rejects %s', (_name, relation, from, to, reason) => {
    expect(checkRelation({ from, relation, to, description: 'Why.' })).toBe(reason);
  });

  it('allows related_to between any two memories, but only with a description', () => {
    expect(
      checkRelation({ from: fact, relation: 'related_to', to: team, description: 'Why.' })
    ).toBeUndefined();
    expect(checkRelation({ from: fact, relation: 'related_to', to: team, description: ' ' })).toBe(
      "'related_to' needs a description of how the two relate"
    );
  });
});

describe('describeRelationRules', () => {
  it('lists each relation with the ends it joins', () => {
    expect(describeRelationRules()).toEqual(
      expect.arrayContaining([
        '- owns: person/team entity -> system/service/project/data/other entity',
        '- about: fact -> any entity, procedure',
        '- related_to: any entity, fact, procedure -> any entity, fact, procedure',
      ])
    );
  });
});
