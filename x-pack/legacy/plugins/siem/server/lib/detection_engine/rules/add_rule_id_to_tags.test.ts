/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addRuleIdToTags } from './add_rule_id_to_tags';
import { INTERNAL_RULE_ID_KEY } from '../../../../common/constants';

describe('add_rule_id_to_tags', () => {
  test('it should add a rule id as an internal structure to a single tag', () => {
    const tags = addRuleIdToTags(['tag 1'], 'rule-1');
    expect(tags).toEqual(['tag 1', `${INTERNAL_RULE_ID_KEY}:rule-1`]);
  });

  test('it should add a rule id as an internal structure to two tags', () => {
    const tags = addRuleIdToTags(['tag 1', 'tag 2'], 'rule-1');
    expect(tags).toEqual(['tag 1', 'tag 2', `${INTERNAL_RULE_ID_KEY}:rule-1`]);
  });

  test('it should add a rule id as an internal structure with empty tags', () => {
    const tags = addRuleIdToTags([], 'rule-1');
    expect(tags).toEqual([`${INTERNAL_RULE_ID_KEY}:rule-1`]);
  });

  test('it should add not add an internal structure if rule id is undefined', () => {
    const tags = addRuleIdToTags(['tag 1'], undefined);
    expect(tags).toEqual(['tag 1']);
  });

  test('it should add not add an internal structure if rule id is null', () => {
    const tags = addRuleIdToTags(['tag 1'], null);
    expect(tags).toEqual(['tag 1']);
  });
});
