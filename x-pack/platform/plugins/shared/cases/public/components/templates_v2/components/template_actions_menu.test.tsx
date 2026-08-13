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

  describe('fieldDefinition mode', () => {
    // The field-library document root IS a single inline field — no `fields:` array, no $ref.
    const FIELD_DEFINITION = `name: root_cause
control: INPUT_TEXT
label: Root cause
type: keyword
`;

    const renderFieldDefinitionMenu = (opts: { value?: string; onChange?: jest.Mock } = {}) => {
      const onChange = opts.onChange ?? jest.fn();
      renderWithTestingProviders(
        <TemplateActionsMenu
          editor={createEditor(1)}
          value={opts.value ?? FIELD_DEFINITION}
          onChange={onChange}
          mode="fieldDefinition"
        />
      );
      return { onChange };
    };

    it('offers only New field and Validation on an empty buffer, with Validation disabled', async () => {
      renderFieldDefinitionMenu({ value: '' });
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));

      expect(await screen.findByText('New field')).toBeInTheDocument();
      expect(screen.queryByText('Field library')).not.toBeInTheDocument();
      expect(screen.queryByText('Conditional logic')).not.toBeInTheDocument();
      expect(screen.getByTestId('fieldDefinitionActionsMenu-validation')).toBeDisabled();
      expect(screen.getByTestId('fieldDefinitionActionsMenu-validation')).toHaveTextContent(
        'Create a field to enable this action'
      );
    });

    it('creates a field scaffold at the document root from an empty buffer', async () => {
      const { onChange } = renderFieldDefinitionMenu({ value: '' });
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));
      await user.click(await screen.findByText('New field'));
      await user.click(await screen.findByText('Text Input'));

      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      const yaml = onChange.mock.calls[0][0];
      expect(yaml).toContain('control: INPUT_TEXT');
      expect(yaml).not.toContain('fields:');
    });

    it('relabels the section "Change field type" once a field exists, with Validation enabled', async () => {
      renderFieldDefinitionMenu();
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));

      expect(await screen.findByText('Change field type')).toBeInTheDocument();
      expect(screen.queryByText('New field')).not.toBeInTheDocument();
      expect(screen.getByTestId('fieldDefinitionActionsMenu-validation')).toBeEnabled();
    });

    it('replaces the whole definition when changing the field type', async () => {
      const { onChange } = renderFieldDefinitionMenu();
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));
      await user.click(await screen.findByText('Change field type'));
      await user.click(await screen.findByText('Toggle'));

      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      const yaml = onChange.mock.calls[0][0];
      expect(yaml).toContain('control: TOGGLE');
      expect(yaml).not.toContain('Root cause');
    });

    it('applies a validation rule to the root field', async () => {
      const { onChange } = renderFieldDefinitionMenu();
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));
      await user.click(await screen.findByTestId('fieldDefinitionActionsMenu-validation'));
      await user.click(await screen.findByText('Required'));

      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      expect(onChange.mock.calls[0][0]).toContain('required: true');
    });

    it('disables both sections when the buffer has YAML errors', async () => {
      renderFieldDefinitionMenu({ value: 'name: a\n\tcontrol: INPUT_TEXT' });
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));

      expect(await screen.findByTestId('fieldDefinitionActionsMenu-newField')).toBeDisabled();
      expect(screen.getByTestId('fieldDefinitionActionsMenu-validation')).toBeDisabled();
    });
  });
});
