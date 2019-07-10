/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { entityToKql } from './add_entities_to_kql';

describe('add_entities_to_kql', () => {
  test('returns empty string with no entity names defined and an empty entity string', () => {
    const entity = entityToKql([], '');
    expect(entity).toEqual('');
  });

  test('returns empty string with no entity names defined and an entity defined', () => {
    const entity = entityToKql([], 'some-value');
    expect(entity).toEqual('');
  });

  test('returns empty string with a single entity name defined but an empty entity string as a single empty double quote', () => {
    const entity = entityToKql(['host.name'], '');
    expect(entity).toEqual('host.name: ""');
  });

  test('returns empty string with two entity names defined but an empty entity string as a single empty double quote', () => {
    const entity = entityToKql(['source.ip', 'destination.ip'], '');
    expect(entity).toEqual('(source.ip: "" or destination.ip: "")');
  });

  test('returns empty string with three entity names defined but an empty entity string as a single empty double quote', () => {
    const entity = entityToKql(['source.ip', 'destination.ip', 'process.name'], '');
    expect(entity).toEqual('(source.ip: "" or destination.ip: "" or process.name: "")');
  });
});
