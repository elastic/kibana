/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowComboBox } from './workflow_combo_box';

const workflows = [
  { id: 'wf-enabled', name: 'Enabled Workflow', enabled: true },
  { id: 'wf-disabled', name: 'Disabled Workflow', enabled: false },
];

function renderComboBox(
  props: Partial<React.ComponentProps<typeof WorkflowComboBox>> = {}
): ReturnType<typeof render> {
  return render(
    <WorkflowComboBox
      workflows={workflows}
      value={[]}
      onChange={jest.fn()}
      aria-label="Workflows"
      {...props}
    />
  );
}

describe('WorkflowComboBox', () => {
  it('shows a selected disabled workflow with a disabled label', () => {
    renderComboBox({ value: ['wf-disabled'] });

    expect(screen.getByText('Disabled Workflow (disabled)')).toBeTruthy();
  });

  it('does not offer unselected disabled workflows as options', async () => {
    const user = userEvent.setup();
    renderComboBox();

    await user.click(screen.getByRole('combobox', { name: 'Workflows' }));

    expect(screen.getByRole('option', { name: 'Enabled Workflow' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Disabled Workflow/ })).toBeNull();
  });

  it('allows removing a selected disabled workflow', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderComboBox({ value: ['wf-disabled'], onChange });

    await user.click(
      screen.getByRole('button', { name: /Remove Disabled Workflow \(disabled\)/i })
    );

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
