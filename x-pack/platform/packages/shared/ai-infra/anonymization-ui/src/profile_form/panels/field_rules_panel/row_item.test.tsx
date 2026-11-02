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
  it('renders entity class dropdown when anonymize is selected', () => {
    const { onRuleEntityClassChange } = renderRow({
      field: 'host.name',
      allowed: true,
      anonymized: true,
      entityClass: 'HOST_NAME',
    });

    const select = screen.getByRole('combobox', { name: 'Entity class for field host.name' });
    expect(select).toBeTruthy();
    fireEvent.change(select, { target: { value: 'RESOURCE_NAME' } });
    expect(onRuleEntityClassChange).toHaveBeenCalledWith('host.name', 'RESOURCE_NAME');
  });

  it('renders reserved mask placeholder when anonymize is not selected', () => {
    renderRow({
      field: 'host.name',
      allowed: true,
      anonymized: false,
      entityClass: undefined,
    });

    expect(screen.queryByRole('combobox', { name: 'Entity class for field host.name' })).toBeNull();
    expect(screen.getByText('Entity class not used')).toBeTruthy();
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
