/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parse as parseYaml } from 'yaml';

jest.mock('@kbn/monaco', () => {
  const actual = jest.requireActual('@kbn/monaco');

  return {
    ...actual,
    monaco: {
      KeyMod: { CtrlCmd: 2048 },
      KeyCode: { KeyK: 41 },
    },
  };
});

const mockUseGetFieldDefinitions = jest.fn();
jest.mock('../../field_library/hooks/use_get_field_definitions', () => ({
  useGetFieldDefinitions: (args: unknown) => mockUseGetFieldDefinitions(args),
}));

const mockToasts = { addSuccess: jest.fn(), addWarning: jest.fn(), addError: jest.fn() };
jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useToasts: () => mockToasts,
}));

jest.mock('../../field_library/components/field_definition_preview', () => ({
  FieldDefinitionPreview: () => <div data-test-subj="fieldDefinitionPreview" />,
}));

import { renderWithTestingProviders } from '../../../common/mock';

import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { validateTemplateDefinitionYaml } from '../utils/validate_template_definition';
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
  const editor = createEditor(opts.lineNumber ?? 1);
  const { rerender } = renderWithTestingProviders(
    <TemplateActionsMenu
      editor={editor}
      value={opts.value ?? TEMPLATE}
      onChange={onChange}
      owner="cases"
    />
  );
  const setValue = (value: string) =>
    rerender(
      <TemplateActionsMenu editor={editor} value={value} onChange={onChange} owner="cases" />
    );
  return { onChange, setValue };
};

const getSearch = () => screen.getByTestId('templateActionsMenu-search');

const expectActiveOption = (testSubj: string) =>
  expect(getSearch()).toHaveAttribute('aria-activedescendant', screen.getByTestId(testSubj).id);

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

  describe('with the cursor on a $ref field', () => {
    const REF_TEMPLATE = `name: T
severity: low
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
  - $ref: Root_Cause
  - $ref: not_in_library
`;
    // Line 7 is the Root_Cause $ref (library match is case-insensitive); line 8 has no definition.

    it('enables Validation and Conditional logic for a $ref resolved through the library', async () => {
      renderMenu({ lineNumber: 7, value: REF_TEMPLATE });
      await user.click(screen.getByTestId('templateActionsMenuButton'));

      expect(await screen.findByTestId('templateActionsMenu-validation')).not.toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.getByTestId('templateActionsMenu-conditional')).not.toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('writes a conditional rule onto the $ref entry as a valid override', async () => {
      const { onChange } = renderMenu({ lineNumber: 7, value: REF_TEMPLATE });
      await user.click(screen.getByTestId('templateActionsMenuButton'));
      await user.click(await screen.findByTestId('templateActionsMenu-conditional'));
      await user.click(await screen.findByText('Require when…'));

      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      const yaml = onChange.mock.calls[0][0] as string;
      expect(validateTemplateDefinitionYaml(yaml)).toEqual({ success: true });
      expect(parseYaml(yaml).fields[1]).toEqual({
        $ref: 'Root_Cause',
        validation: { required_when: { field: 'field_name', operator: 'eq', value: 'value' } },
      });
    });

    it('keeps the rule categories disabled for a $ref with no library definition', async () => {
      renderMenu({ lineNumber: 8, value: REF_TEMPLATE });
      await user.click(screen.getByTestId('templateActionsMenuButton'));

      expect(await screen.findByTestId('templateActionsMenu-validation')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.getByTestId('templateActionsMenu-conditional')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });
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

  it('renders Configure and add / Add as pointer-only shortcuts outside the tab order', async () => {
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));

    const configure = await screen.findByTestId(
      'templateActionsMenu-newField-INPUT_TEXT-configure'
    );
    const add = screen.getByTestId('templateActionsMenu-newField-INPUT_TEXT-add');
    expect(configure).toHaveAttribute('aria-label', 'Configure and add');
    expect(add).toHaveAttribute('aria-label', 'Add');
    expect(configure).toHaveAttribute('tabindex', '-1');
    expect(add).toHaveAttribute('tabindex', '-1');
    // Hidden from the accessibility tree: an option must not contain interactive content.
    const row = screen.getByTestId('templateActionsMenu-newField-INPUT_TEXT');
    expect(within(row).queryAllByRole('button')).toHaveLength(0);
    const labels = within(row)
      .getAllByRole('button', { hidden: true })
      .map((button) => button.getAttribute('aria-label'));
    expect(labels.indexOf('Configure and add')).toBeLessThan(labels.indexOf('Add'));
    // The same actions are documented for keyboard users on the search combobox.
    expect(
      screen.getByText(/Shift\+Enter to configure a field before adding it/)
    ).toBeInTheDocument();
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
    expect(screen.getByTestId('configureAndAddModal').textContent).toContain('Text Input');

    await user.click(screen.getByTestId('configureAndAdd-cancel'));

    expect(screen.queryByTestId('configureAndAddModal')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'New field' })).toBeInTheDocument();
    expect(
      screen.getByTestId('templateActionsMenu-newField-INPUT_TEXT-configure')
    ).toBeInTheDocument();
    await waitFor(() => expect(getSearch()).toHaveFocus());
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
    expect(validateTemplateDefinitionYaml(yaml)).toEqual({ success: true });
    const { fields } = ParsedTemplateDefinitionSchema.parse(parseYaml(yaml));
    expect(fields).toContainEqual({
      name: 'summary_2',
      label: 'Summary',
      control: 'INPUT_TEXT',
      type: 'keyword',
      validation: { required: true },
      display: { show_when: { field: 'summary', operator: 'eq', value: 'high' } },
    });
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

  describe('keyboard', () => {
    const openMenu = async () => {
      renderMenu({ lineNumber: 1 });
      await user.click(screen.getByTestId('templateActionsMenuButton'));
      await waitFor(() => expect(getSearch()).toHaveFocus());
    };

    it('moves the EuiSelectable active option with the arrow keys', async () => {
      await openMenu();
      expect(getSearch()).not.toHaveAttribute('aria-activedescendant');

      await user.keyboard('{ArrowDown}');
      expectActiveOption('templateActionsMenu-newField');
      await user.keyboard('{ArrowDown}');
      expectActiveOption('templateActionsMenu-fieldLibrary');
      // Disabled categories (no field at the cursor) are skipped, wrapping back to the top.
      await user.keyboard('{ArrowDown}');
      expectActiveOption('templateActionsMenu-newField');
      await user.keyboard('{ArrowUp}');
      expectActiveOption('templateActionsMenu-fieldLibrary');
    });

    it('drills in with Enter and inserts the active leaf with Enter', async () => {
      const { onChange } = renderMenu({ lineNumber: 1 });
      await user.click(screen.getByTestId('templateActionsMenuButton'));
      await waitFor(() => expect(getSearch()).toHaveFocus());

      await user.keyboard('{ArrowDown}{Enter}');
      expect(await screen.findByRole('heading', { name: 'New field' })).toBeInTheDocument();
      await waitFor(() => expect(getSearch()).toHaveFocus());

      await user.keyboard('{ArrowDown}');
      expectActiveOption('templateActionsMenu-newField-INPUT_TEXT');
      await user.keyboard('{Enter}');

      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      expect(onChange.mock.calls[0][0]).toContain('control: INPUT_TEXT');
    });

    it('drills into the active category with ArrowRight and goes back with ArrowLeft', async () => {
      await openMenu();
      await user.keyboard('{ArrowDown}{ArrowRight}');
      expect(await screen.findByRole('heading', { name: 'New field' })).toBeInTheDocument();

      await waitFor(() => expect(getSearch()).toHaveFocus());
      await user.keyboard('{ArrowLeft}');
      expect(await screen.findByRole('heading', { name: 'Actions menu' })).toBeInTheDocument();
    });

    it('goes back with Escape, then closes the menu', async () => {
      await openMenu();
      await user.keyboard('{ArrowDown}{ArrowRight}');
      expect(await screen.findByRole('heading', { name: 'New field' })).toBeInTheDocument();
      await waitFor(() => expect(getSearch()).toHaveFocus());

      await user.keyboard('{Escape}');
      expect(await screen.findByRole('heading', { name: 'Actions menu' })).toBeInTheDocument();
      await user.keyboard('{Escape}');
      await waitFor(() =>
        expect(screen.queryByTestId('templateActionsMenuContent')).not.toBeInTheDocument()
      );
    });

    it('opens Configure and add for the active leaf with Shift+Enter', async () => {
      const { onChange } = renderMenu({ lineNumber: 1 });
      await user.click(screen.getByTestId('templateActionsMenuButton'));
      await user.click(await screen.findByText('New field'));
      await waitFor(() => expect(getSearch()).toHaveFocus());

      await user.keyboard('{ArrowDown}{Shift>}{Enter}{/Shift}');
      expect(await screen.findByTestId('configureAndAddModal')).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('selects the first search result with Enter', async () => {
      const { onChange } = renderMenu({ lineNumber: 1 });
      await user.click(screen.getByTestId('templateActionsMenuButton'));
      await waitFor(() => expect(getSearch()).toHaveFocus());

      await user.keyboard('toggle');
      await waitFor(() => expectActiveOption('templateActionsMenu-newField-TOGGLE'));
      await user.keyboard('{Enter}');

      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      expect(onChange.mock.calls[0][0]).toContain('control: TOGGLE');
    });
  });

  it('renders the full menu as a modal dialog inside a focus trap', async () => {
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));

    const dialog = await screen.findByRole('dialog', { name: 'Template actions menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // EUI's jest test-env stubs EuiFocusTrap with a marker div (no focus-lock behaviour), so
    // tab containment itself can only be asserted in a real browser; check the wiring instead.
    expect(screen.getByTestId('templateActionsMenuFocusTrap')).toContainElement(dialog);
    await waitFor(() => expect(getSearch()).toHaveFocus());
    expect(dialog).toContainElement(getSearch());
  });

  it('shows a loading state while library fields are loading', async () => {
    mockUseGetFieldDefinitions.mockReturnValue({ data: undefined, isLoading: true });
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByTestId('templateActionsMenu-fieldLibrary'));

    expect(await screen.findByText('Loading library fields…')).toHaveAttribute(
      'aria-live',
      'polite'
    );
    expect(
      screen.queryByText(
        'Create reusable fields in the Field library, then reference them from any template.'
      )
    ).not.toBeInTheDocument();
  });

  it('shows an error state when library fields fail to load', async () => {
    mockUseGetFieldDefinitions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderMenu();
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByTestId('templateActionsMenu-fieldLibrary'));

    expect(await screen.findByTestId('templateActionsMenu-childrenError')).toHaveTextContent(
      "Library fields couldn't be loaded."
    );
  });

  it('keeps Configure and add open with its input when the insert is rejected', async () => {
    const { onChange, setValue } = renderMenu({ lineNumber: 1 });
    await user.click(screen.getByTestId('templateActionsMenuButton'));
    await user.click(await screen.findByText('New field'));
    await user.click(
      await screen.findByTestId('templateActionsMenu-newField-INPUT_TEXT-configure')
    );
    await user.type(await screen.findByTestId('configureAndAdd-label'), 'Impact');

    // The buffer becomes unparseable while the modal is open.
    setValue('name: T\nfields: [ {name: a');
    await user.click(screen.getByTestId('configureAndAdd-confirm'));

    expect(mockToasts.addWarning).toHaveBeenCalledWith(
      'Fix the YAML errors in the editor before adding to the template'
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('configureAndAddModal')).toBeInTheDocument();
    expect(screen.getByTestId('configureAndAdd-label')).toHaveValue('Impact');
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
      expect(mockToasts.addSuccess).toHaveBeenCalledWith('Field type changed to Toggle');
    });

    it('announces a new field when the buffer was empty', async () => {
      renderFieldDefinitionMenu({ value: '' });
      await user.click(screen.getByTestId('fieldDefinitionActionsMenuButton'));
      await user.click(await screen.findByText('New field'));
      await user.click(await screen.findByText('Text Input'));

      await waitFor(() => expect(mockToasts.addSuccess).toHaveBeenCalledWith('"Text Input" added'));
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
