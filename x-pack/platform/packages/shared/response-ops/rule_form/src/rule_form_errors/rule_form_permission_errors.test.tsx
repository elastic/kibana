/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuleFormActionPermissionError } from './rule_form_action_permission_error';
import { RuleFormRulePermissionError } from './rule_form_rule_permission_error';
import {
  RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_DESCRIPTION,
  RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_TITLE,
  RULE_FORM_PAGE_RULE_NO_PERMISSION_DESCRIPTION,
  RULE_FORM_PAGE_RULE_NO_PERMISSION_TITLE,
} from '../translations';

describe('RuleFormRulePermissionError', () => {
  test('explains that All privileges are required for the rule feature', () => {
    render(<RuleFormRulePermissionError />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_NO_PERMISSION_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_NO_PERMISSION_DESCRIPTION)).toBeInTheDocument();
  });
});

describe('RuleFormActionPermissionError', () => {
  test('explains that access to actions and connectors is required', () => {
    render(<RuleFormActionPermissionError />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_TITLE)).toBeInTheDocument();
    expect(
      screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_DESCRIPTION)
    ).toBeInTheDocument();
  });
});
