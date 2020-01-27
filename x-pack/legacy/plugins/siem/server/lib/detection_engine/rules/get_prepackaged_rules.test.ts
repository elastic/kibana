/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPrepackagedRules } from './get_prepackaged_rules';

describe('get_existing_prepackaged_rules', () => {
  test('should not throw any errors with the existing checked in pre-packaged rules', () => {
    expect(() => getPrepackagedRules()).not.toThrow();
  });

  test('should throw an exception if a pre-packaged rule is not valid', () => {
    expect(() => getPrepackagedRules([{ not_valid_made_up_key: true }])).toThrow(
      'name: "(rule_name unknown)", rule_id: "(rule_id unknown)" within the folder rules/prepackaged_rules is not a valid detection engine rule. Expect the system to not work with pre-packaged rules until this rule is fixed or the file is removed. Error is: child "description" fails because ["description" is required]'
    );
  });

  test('should throw an exception with a message having rule_id and name in it', () => {
    expect(() => getPrepackagedRules([{ name: 'rule name', rule_id: 'id-123' }])).toThrow(
      'name: "rule name", rule_id: "id-123" within the folder rules/prepackaged_rules is not a valid detection engine rule. Expect the system to not work with pre-packaged rules until this rule is fixed or the file is removed. Error is: child "description" fails because ["description" is required]'
    );
  });
});
