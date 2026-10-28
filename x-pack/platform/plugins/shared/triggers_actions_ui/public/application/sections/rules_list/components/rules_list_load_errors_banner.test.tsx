/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { RulesListLoadErrorsBanner } from './rules_list_load_errors_banner';

describe('RulesListLoadErrorsBanner', () => {
  it('renders the number of rules with errors and their names and ids', () => {
    renderWithI18n(
      <RulesListLoadErrorsBanner
        errors={[
          {
            message: 'Error injecting reference into rule params for rule id rule-id-2 - broken',
            rule: { id: 'rule-id-2', name: 'my rule' },
          },
          {
            message: 'Error injecting reference into rule params for rule id rule-id-3 - broken',
            rule: { id: 'rule-id-3' },
          },
        ]}
      />
    );

    const banner = screen.getByTestId('rulesListLoadErrorsBanner');
    expect(banner).toHaveTextContent('2 rules could not be loaded correctly');
    expect(banner).toHaveTextContent('my rule (rule-id-2)');
    // falls back to the rule id when the name is unavailable
    expect(banner).toHaveTextContent('rule-id-3');
    // the technical error message is not shown to the user
    expect(banner).not.toHaveTextContent('Error injecting reference');
  });
});
