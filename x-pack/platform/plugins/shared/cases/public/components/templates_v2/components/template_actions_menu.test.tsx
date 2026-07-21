/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/monaco', () => ({
  monaco: {
    KeyMod: { CtrlCmd: 2048 },
    KeyCode: { KeyK: 41 },
  },
}));

const mockUseGetFieldDefinitions = jest.fn();
jest.mock('../../field_library/hooks/use_get_field_definitions', () => ({
  useGetFieldDefinitions: (args: unknown) => mockUseGetFieldDefinitions(args),
}));

import { renderWithTestingProviders } from '../../../common/mock';

import { TemplateActionsMenu } from './template_actions_menu';

const TEMPLATE = `name: T
severity: low
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
`;
// Line 5 (control: INPUT_TEXT) is inside the "summary" field; line 1 is case data.

// EUI popovers/menus set `pointer-events: none` on wrappers in jsdom; disable the check so clicks land.
const user = userEvent.setup({ pointerEventsCheck: 0 });

const createEditor = (lineNumber: number) =>
  ({
    getPosition: () => ({ lineNumber, column: 1 }),
    addAction: () => ({ dispose: jest.fn() }),
    focus: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial Monaco editor test double
  } as any);

const renderMenu = (opts: { lineNumber?: number; value?: string; onChange?: jest.Mock } = {}) => {
  const onChange = opts.onChange ?? jest.fn();
  renderWithTestingProviders(
    <TemplateActionsMenu
      editor={createEditor(opts.lineNumber ?? 1)}
      value={opts.value ?? TEMPLATE}
      onChange={onChange}
      owner="cases"
    />
  );
  return { onChange };
};

describe('TemplateActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [{ fieldDefinitionId: 'root_cause', name: 'root_cause' }] },
      isLoading: false,
    });
  });

  it('opens the menu with the four top-level actions', async () => {
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));

    expect(await screen.findByText('New field')).toBeInTheDocument();
    expect(screen.getByText('Field library')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Conditional logic')).toBeInTheDocument();
  });

  it('inserts a scaffolded field via New field → field type', async () => {
    const { onChange } = renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));
    await user.click(await screen.findByText('Text Input'));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0]).toContain('control: INPUT_TEXT');
  });

  it('disables Validation and Conditional logic when the cursor is not on a field', async () => {
    renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));

    expect(await screen.findByTestId('templateActionsMenu-validation')).toBeDisabled();
    expect(screen.getByTestId('templateActionsMenu-conditional')).toBeDisabled();
  });

  it('exposes the disabled reason in the item text (reachable without hover) for a11y', async () => {
    renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));

    // The reason is in the item content (accessible name), not just a hover-only tooltip.
    const validation = await screen.findByTestId('templateActionsMenu-validation');
    expect(validation).toHaveTextContent('Place the cursor on a field to enable this action');
  });

  it('applies a validation rule to the field under the cursor', async () => {
    const { onChange } = renderMenu({ lineNumber: 5 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByTestId('templateActionsMenu-validation'));
    await user.click(await screen.findByText('Required'));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0]).toContain('required: true');
  });

  it('disables the mutating branches when the buffer has YAML errors', async () => {
    renderMenu({ value: 'name: T\nfields: [ {name: a', lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));

    expect(await screen.findByTestId('templateActionsMenu-newField')).toBeDisabled();
    expect(screen.getByTestId('templateActionsMenu-fieldLibrary')).toBeDisabled();
    expect(screen.getByTestId('templateActionsMenu-validation')).toBeDisabled();
  });

  it('links a library field as a $ref via Field library', async () => {
    const { onChange } = renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('Field library'));
    await user.click(await screen.findByText('root_cause'));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0]).toContain('$ref: root_cause');
  });
});
