/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FieldRule } from '@kbn/anonymization-common';
import { FIELD_RULE_ACTION_ANONYMIZE } from '../../hooks/field_rule_actions';
import { FieldRulesPanelRowItem } from './row_item';

const renderRow = (rule: FieldRule) => {
  const onRuleActionChange = jest.fn();
  const onRuleEntityClassChange = jest.fn();

  render(
    <FieldRulesPanelRowItem
      rule={rule}
      isSelected={false}
      showValidationErrors={false}
      isManageMode
      isSubmitting={false}
      onToggleSelection={jest.fn()}
      onRuleActionChange={onRuleActionChange}
      onRuleEntityClassChange={onRuleEntityClassChange}
    />
  );

  return { onRuleActionChange, onRuleEntityClassChange };
};

describe('FieldRulesPanelRowItem', () => {
  it('renders mask input when anonymize is selected', () => {
    const { onRuleEntityClassChange } = renderRow({
      field: 'host.name',
      allowed: true,
      anonymized: true,
      entityClass: 'HOST_NAME',
    });

    const input = screen.getByPlaceholderText('Entity class');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'NEW_MASK' } });
    expect(onRuleEntityClassChange).toHaveBeenCalledWith('host.name', 'NEW_MASK');
  });

  it('renders reserved mask placeholder when anonymize is not selected', () => {
    renderRow({
      field: 'host.name',
      allowed: true,
      anonymized: false,
      entityClass: undefined,
    });

    expect(screen.queryByPlaceholderText('Entity class')).toBeNull();
    expect(screen.getByText('Mask not used')).toBeTruthy();
  });

  it('forwards selected policy from segmented control', () => {
    const { onRuleActionChange } = renderRow({
      field: 'host.name',
      allowed: true,
      anonymized: false,
      entityClass: undefined,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Anonymize' }));
    expect(onRuleActionChange).toHaveBeenCalledWith('host.name', FIELD_RULE_ACTION_ANONYMIZE);
  });
});
