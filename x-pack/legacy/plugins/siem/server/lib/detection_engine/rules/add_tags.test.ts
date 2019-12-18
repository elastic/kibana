/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addTags } from './add_tags';
import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';

describe('add_tags', () => {
  test('if given a null everything this returns a new array for tags', () => {
    const tags = addTags(null, null, null);
    expect(tags).toEqual([]);
  });

  test('if given a undefined everything this returns a new array for tags', () => {
    const tags = addTags(undefined, undefined, undefined);
    expect(tags).toEqual([]);
  });

  test('it should add a rule id as an internal structure to a single tag', () => {
    const tags = addTags(['tag 1'], 'rule-1', null);
    expect(tags).toEqual(['tag 1', `${INTERNAL_RULE_ID_KEY}:rule-1`]);
  });

  test('it should add a rule id as an internal structure to a single tag if the input tags is null', () => {
    const tags = addTags(null, 'rule-1', null);
    expect(tags).toEqual([`${INTERNAL_RULE_ID_KEY}:rule-1`]);
  });

  test('it should add a rule id as an internal structure to two tags', () => {
    const tags = addTags(['tag 1', 'tag 2'], 'rule-1', null);
    expect(tags).toEqual(['tag 1', 'tag 2', `${INTERNAL_RULE_ID_KEY}:rule-1`]);
  });

  test('it should add a rule id as an internal structure with empty tags', () => {
    const tags = addTags([], 'rule-1', null);
    expect(tags).toEqual([`${INTERNAL_RULE_ID_KEY}:rule-1`]);
  });

  test('it should add a immutable true as an internal structure with empty tags', () => {
    const tags = addTags([], null, true);
    expect(tags).toEqual([`${INTERNAL_IMMUTABLE_KEY}:true`]);
  });

  test('it should add a immutable false as an internal structure with empty tags', () => {
    const tags = addTags([], null, false);
    expect(tags).toEqual([`${INTERNAL_IMMUTABLE_KEY}:false`]);
  });

  test('it should add a rule id as an internal structure with immutable true', () => {
    const tags = addTags([], 'rule-1', true);
    expect(tags).toEqual([`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:true`]);
  });

  test('it should add a rule id as an internal structure with immutable false', () => {
    const tags = addTags([], 'rule-1', false);
    expect(tags).toEqual([`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:false`]);
  });

  test('it should add not add an internal structure if only a tag is given', () => {
    const tags = addTags(['tag 1'], undefined, null);
    expect(tags).toEqual(['tag 1']);
  });

  test('it should add not add an internal structure if everything is null', () => {
    const tags = addTags(['tag 1'], null, null);
    expect(tags).toEqual(['tag 1']);
  });

  test('it should add not add an internal structure if everything is undefined', () => {
    const tags = addTags(['tag 1'], undefined, undefined);
    expect(tags).toEqual(['tag 1']);
  });
});
