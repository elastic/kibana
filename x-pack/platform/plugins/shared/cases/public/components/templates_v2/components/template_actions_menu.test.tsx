/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
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

jest.mock('../../field_library/components/field_definition_preview', () => ({
  FieldDefinitionPreview: () => <div data-test-subj="fieldDefinitionPreview" />,
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
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'root_cause',
            name: 'root_cause',
            definition: 'name: root_cause\ncontrol: INPUT_TEXT\nlabel: Root cause\ntype: keyword\n',
            description: 'Why it happened',
          },
        ],
      },
      isLoading: false,
    });
  });

  it('opens the menu with the four top-level actions, search, and category headers', async () => {
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));

    expect(await screen.findByText('New field')).toBeInTheDocument();
    expect(screen.getByText('Field library')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Conditional logic')).toBeInTheDocument();
    expect(screen.getByText('Add field')).toBeInTheDocument();
    expect(screen.getByText('Field rules')).toBeInTheDocument();
    expect(screen.getByTestId('templateActionsMenu-search')).toBeInTheDocument();
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

    // EuiSelectable marks disabled options with aria-disabled on the <li role="option">.
    expect(await screen.findByTestId('templateActionsMenu-validation')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByTestId('templateActionsMenu-conditional')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.queryByTestId('templateActionsMenu-validation-chevron')).not.toBeInTheDocument();
    expect(screen.queryByTestId('templateActionsMenu-conditional-chevron')).not.toBeInTheDocument();
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

    expect(await screen.findByTestId('templateActionsMenu-newField')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByTestId('templateActionsMenu-fieldLibrary')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByTestId('templateActionsMenu-validation')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('links a library field as a $ref via Field library', async () => {
    const { onChange } = renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('Field library'));
    await user.click(await screen.findByText('root_cause'));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0]).toContain('$ref: root_cause');
  });

  it('links to the field library table from the Field library empty state', async () => {
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [] },
      isLoading: false,
    });
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByTestId('templateActionsMenu-fieldLibrary'));

    expect(
      await screen.findByText(
        'Create reusable fields in the Field library, then reference them from any template.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('actionsMenuPreviewOpenFieldLibrary')).toBeInTheDocument();
    expect(await screen.findByTestId('templateActionsMenu-back')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Field library' })).toBeInTheDocument();
  });

  it('reveals Configure and add and Add quick actions on New field leaves', async () => {
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));

    const configure = await screen.findByTestId(
      'templateActionsMenu-newField-INPUT_TEXT-configure'
    );
    const add = screen.getByTestId('templateActionsMenu-newField-INPUT_TEXT-add');
    expect(configure).toHaveAttribute('aria-label', 'Configure and add');
    expect(add).toHaveAttribute('aria-label', 'Add');
    const row = screen.getByTestId('templateActionsMenu-newField-INPUT_TEXT');
    const labels = within(row)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    expect(labels.indexOf('Configure and add')).toBeLessThan(labels.indexOf('Add'));
  });

  it('inserts immediately from the Add quick action without opening the configure modal', async () => {
    const { onChange } = renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));
    await user.click(await screen.findByTestId('templateActionsMenu-newField-INPUT_TEXT-add'));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0]).toContain('control: INPUT_TEXT');
    expect(screen.queryByTestId('configureAndAddModal')).not.toBeInTheDocument();
  });

  it('opens Configure and add from the quick action and Cancel restores the drilled-in menu', async () => {
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));
    await user.click(
      await screen.findByTestId('templateActionsMenu-newField-INPUT_TEXT-configure')
    );

    expect(await screen.findByTestId('configureAndAddModal')).toBeInTheDocument();
    expect(screen.getByText('Configure field')).toBeInTheDocument();
    expect(screen.getByTestId('configureAndAddModal').textContent).toContain('Text input');

    await user.click(screen.getByTestId('configureAndAdd-cancel'));

    expect(screen.queryByTestId('configureAndAddModal')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'New field' })).toBeInTheDocument();
    expect(
      screen.getByTestId('templateActionsMenu-newField-INPUT_TEXT-configure')
    ).toBeInTheDocument();
  });

  it('inserts schema-correct YAML from Configure and add, uniquifies the key, and closes both surfaces', async () => {
    const { onChange } = renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));
    await user.click(
      await screen.findByTestId('templateActionsMenu-newField-INPUT_TEXT-configure')
    );

    const labelInput = await screen.findByTestId('configureAndAdd-label');
    await user.type(labelInput, 'Summary');
    await user.click(screen.getByTestId('configureAndAdd-addRule'));
    await user.click(screen.getByTestId('configureAndAdd-addCondition'));
    await user.type(screen.getByLabelText('Value'), 'high');
    await user.click(screen.getByTestId('configureAndAdd-confirm'));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const yaml = onChange.mock.calls[0][0] as string;
    expect(yaml).toContain('name: summary_2');
    expect(yaml).toContain('label: Summary');
    expect(yaml).toContain('control: INPUT_TEXT');
    expect(yaml).toContain('required: true');
    expect(yaml).toContain('show_when:');
    expect(yaml).toContain('field: summary');
    expect(yaml).toContain('value: high');
    expect(screen.queryByTestId('configureAndAddModal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('templateActionsMenuContent')).not.toBeInTheDocument();
  });

  it('shows a read-only library definition and disables conditional logic when no sibling fields exist', async () => {
    const { onChange } = renderMenu({
      lineNumber: 1,
      value: 'name: T\nseverity: low\n',
    });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('Field library'));
    await user.click(
      await screen.findByTestId('templateActionsMenu-fieldLibrary-root_cause-configure')
    );

    expect(await screen.findByTestId('configureAndAddModal')).toBeInTheDocument();
    expect(screen.getByTestId('configureAndAdd-libraryLabel')).toHaveAttribute('readonly');
    expect(screen.getByTestId('configureAndAdd-libraryKey')).toHaveValue('root_cause');
    expect(screen.getByTestId('configureAndAdd-addCondition')).toBeDisabled();
    expect(
      screen.getByText('Add another field to the template to use conditional logic.')
    ).toBeInTheDocument();

    await user.click(screen.getByTestId('configureAndAdd-confirm'));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0]).toContain('$ref: root_cause');
    expect(onChange.mock.calls[0][0]).not.toContain('display:');
    expect(onChange.mock.calls[0][0]).not.toContain('validation:');
  });

  it('goes back one level on Escape while drilled in, and closes at the root', async () => {
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));

    expect(await screen.findByTestId('templateActionsMenu-back')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'New field' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('templateActionsMenuContent'), { key: 'Escape' });

    expect(await screen.findByText('Field library')).toBeInTheDocument();
    expect(screen.getByTestId('templateActionsMenu-back')).not.toBeVisible();
    expect(screen.getByRole('heading', { name: 'Actions menu' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('templateActionsMenuContent'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('templateActionsMenuContent')).not.toBeInTheDocument();
    });
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
      expect(screen.queryByTestId('fieldDefinitionActionsMenu-search')).not.toBeInTheDocument();
      expect(screen.queryByText('Add field')).not.toBeInTheDocument();
      expect(screen.queryByText('Field rules')).not.toBeInTheDocument();
      expect(screen.getByTestId('fieldDefinitionActionsMenu-validation')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
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
      expect(screen.getByTestId('fieldDefinitionActionsMenu-validation')).not.toHaveAttribute(
        'aria-disabled',
        'true'
      );
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

    it('does not show Configure and add quick actions in compact mode', async () => {
      renderFieldDefinitionMenu({ value: '' });
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));
      await user.click(await screen.findByText('New field'));

      expect(
        screen.queryByTestId('fieldDefinitionActionsMenu-newField-INPUT_TEXT-configure')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('fieldDefinitionActionsMenu-newField-INPUT_TEXT-add')
      ).not.toBeInTheDocument();
    });

    it('disables both sections when the buffer has YAML errors', async () => {
      renderFieldDefinitionMenu({ value: 'name: a\n\tcontrol: INPUT_TEXT' });
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));

      expect(await screen.findByTestId('fieldDefinitionActionsMenu-newField')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.getByTestId('fieldDefinitionActionsMenu-validation')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });
  });
});
