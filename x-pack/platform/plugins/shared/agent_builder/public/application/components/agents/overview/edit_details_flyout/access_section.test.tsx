/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { AccessSection } from './access_section';
import type { EditDetailsFormData } from './types';

/**
 * Wraps AccessSection in a minimal react-hook-form provider so the underlying
 * `Controller` can bind to a form. Each test can override the initial
 * `access_control.access_mode`.
 */
const HarnessedAccessSection: React.FC<{
  canChangeAccessControlMode?: boolean;
  initialAccessMode?: AgentAccessControlMode;
}> = ({ canChangeAccessControlMode = true, initialAccessMode = AgentAccessControlMode.Public }) => {
  const methods = useForm<EditDetailsFormData>({
    defaultValues: {
      name: 'Agent',
      description: 'desc',
      avatar_symbol: '',
      avatar_color: '',
      labels: [],
      access_control: { access_mode: initialAccessMode },
      configuration: {
        enable_elastic_capabilities: false,
        workflow_ids: [],
        instructions: '',
      },
    },
  });
  return (
    <FormProvider {...methods}>
      <AccessSection canChangeAccessControlMode={canChangeAccessControlMode} />
    </FormProvider>
  );
};

describe('AccessSection', () => {
  it('offers all three access modes in the select', () => {
    render(<HarnessedAccessSection />);

    fireEvent.click(screen.getByTestId('editDetailsAccessControlModeSelect'));

    const optionLabels = screen.getAllByRole('option').map((el) => el.textContent ?? '');
    expect(optionLabels.some((l) => /private/i.test(l))).toBe(true);
    expect(optionLabels.some((l) => /shared/i.test(l))).toBe(true);
    expect(optionLabels.some((l) => /public/i.test(l))).toBe(true);
  });

  it('disables the select when the user cannot change the access mode', () => {
    render(<HarnessedAccessSection canChangeAccessControlMode={false} />);

    expect(screen.getByTestId('editDetailsAccessControlModeSelect')).toBeDisabled();
  });
});
