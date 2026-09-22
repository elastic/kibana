/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldDefinitionFlyout } from './field_definition_flyout';
import { renderWithTestingProviders } from '../../../common/mock';

const mockYamlEditorProps = jest.fn();
jest.mock('./field_definition_yaml_editor', () => ({
  FieldDefinitionYamlEditor: ({
    value,
    onChange,
    isEditing,
  }: {
    value: string;
    onChange: (v: string) => void;
    isEditing?: boolean;
  }) => {
    mockYamlEditorProps({ isEditing });
    return (
      <textarea
        data-test-subj="fieldDefinitionYamlInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
}));

jest.mock('./field_definition_preview', () => ({
  FieldDefinitionPreview: () => <div data-test-subj="fieldDefinitionPreview" />,
}));

const VALID_YAML = `name: my_field
label: "My Field"
control: INPUT_TEXT
type: keyword
`;

const defaultProps = {
  owner: 'securitySolution',
  onSave: jest.fn(),
  onClose: jest.fn(),
};

describe('FieldDefinitionFlyout — isGlobal checkbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the isGlobal checkbox unchecked by default', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    const checkbox = screen.getByTestId('fieldDefinitionApplyToAllCasesCheckbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('renders the isGlobal checkbox checked when fieldDefinition has isGlobal: true', () => {
    const fieldDefinition = {
      fieldDefinitionId: 'fd-1',
      name: 'my_field',
      owner: 'securitySolution' as const,
      definition: VALID_YAML,
      isGlobal: true,
    };

    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    const checkbox = screen.getByTestId('fieldDefinitionApplyToAllCasesCheckbox');
    expect(checkbox).toBeChecked();
  });

  it('passes isGlobal: false to onSave when checkbox is unchecked', async () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    // Set a valid YAML so validation passes
    const yamlInput = screen.getByTestId('fieldDefinitionYamlInput');
    fireEvent.change(yamlInput, { target: { value: VALID_YAML } });

    fireEvent.click(screen.getByTestId('fieldDefinitionSaveButton'));

    expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({ isGlobal: false }));
  });

  it('passes isGlobal: true to onSave when checkbox is checked', async () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    const yamlInput = screen.getByTestId('fieldDefinitionYamlInput');
    fireEvent.change(yamlInput, { target: { value: VALID_YAML } });

    const checkbox = screen.getByTestId('fieldDefinitionApplyToAllCasesCheckbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByTestId('fieldDefinitionSaveButton'));

    expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({ isGlobal: true }));
  });

  it('prevents saving until the YAML defines a valid inline field', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    const yamlInput = screen.getByTestId('fieldDefinitionYamlInput');
    fireEvent.change(yamlInput, { target: { value: 'name: my_field\n$ref: existing_field\n' } });

    expect(screen.getByTestId('fieldDefinitionSaveButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('fieldDefinitionSaveButton'));
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('toggles isGlobal when checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    const checkbox = screen.getByTestId('fieldDefinitionApplyToAllCasesCheckbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('displays the isGlobal label text', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    expect(screen.getByText('Global field')).toBeInTheDocument();
  });
});

describe('FieldDefinitionFlyout — YAML editor mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes isEditing: false to the YAML editor when creating', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    expect(mockYamlEditorProps).toHaveBeenCalledWith({ isEditing: false });
  });

  it('passes isEditing: true to the YAML editor when editing an existing definition', () => {
    const fieldDefinition = {
      fieldDefinitionId: 'fd-1',
      name: 'my_field',
      owner: 'securitySolution' as const,
      definition: VALID_YAML,
      isGlobal: false,
    };

    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    expect(mockYamlEditorProps).toHaveBeenCalledWith({ isEditing: true });
  });
});

describe('FieldDefinitionFlyout — permanent identity', () => {
  const fieldDefinition = {
    fieldDefinitionId: 'fd-1',
    name: 'my_field',
    owner: 'securitySolution' as const,
    definition: VALID_YAML,
    isGlobal: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the read-only identity (name and type) when editing', () => {
    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    expect(screen.getByTestId('fieldDefinitionIdentityPanel')).toBeInTheDocument();
    expect(screen.getByTestId('fieldDefinitionIdentityName')).toHaveTextContent('my_field');
    expect(screen.getByTestId('fieldDefinitionIdentityType')).toHaveTextContent('keyword');
    expect(
      screen.getByText(
        'This is the permanent key used to access this field in case data and Cases analytics. It cannot be changed after creation.'
      )
    ).toBeInTheDocument();
  });

  it('does not show the identity panel when creating', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    expect(screen.queryByTestId('fieldDefinitionIdentityPanel')).not.toBeInTheDocument();
  });

  it('disables save and shows an inline error when the name is changed', () => {
    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: { value: 'name: renamed_field\ncontrol: INPUT_TEXT\ntype: keyword\n' },
    });

    expect(screen.getByTestId('fieldDefinitionSaveButton')).toBeDisabled();
    expect(
      screen.getByText(
        'The field name and type are permanent. Restore the name to "my_field" and the type to "keyword" to save your changes.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('fieldDefinitionSaveButton'));
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('disables save and shows an inline error when the type is changed', () => {
    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: { value: 'name: my_field\ncontrol: INPUT_NUMBER\ntype: integer\n' },
    });

    expect(screen.getByTestId('fieldDefinitionSaveButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('fieldDefinitionSaveButton'));
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('re-enables save when the identity is restored', () => {
    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    const yamlInput = screen.getByTestId('fieldDefinitionYamlInput');
    fireEvent.change(yamlInput, {
      target: { value: 'name: renamed_field\ncontrol: INPUT_TEXT\ntype: keyword\n' },
    });
    expect(screen.getByTestId('fieldDefinitionSaveButton')).toBeDisabled();

    fireEvent.change(yamlInput, { target: { value: VALID_YAML } });
    expect(screen.getByTestId('fieldDefinitionSaveButton')).not.toBeDisabled();
  });

  it('allows saving metadata-only edits (label, validation)', () => {
    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: {
        value:
          'name: my_field\nlabel: "Renamed Label"\ncontrol: INPUT_TEXT\ntype: keyword\nvalidation:\n  required: true\n',
      },
    });

    expect(screen.getByTestId('fieldDefinitionSaveButton')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('fieldDefinitionSaveButton'));
    expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'my_field' }));
  });

  it('mentions the permanent identity in the create-mode YAML help text', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    expect(
      screen.getByText(
        /The name and type become the permanent key for case data and Cases analytics/
      )
    ).toBeInTheDocument();
  });
});

describe('FieldDefinitionFlyout — authoring warnings', () => {
  const REQUIRED_NO_DEFAULT_YAML = `name: my_field
label: "My Field"
control: INPUT_TEXT
type: keyword
validation:
  required: true
`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the permanent-identity notice with the parsed name and type when creating', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    const notice = screen.getByTestId('fieldDefinitionIdentityNotice');
    expect(notice).toHaveTextContent('The name and type are permanent once saved');
    expect(notice).toHaveTextContent('"my_field" (keyword)');
  });

  it('does not show the identity notice when the YAML is invalid', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: { value: 'name: my_field\n$ref: something\n' },
    });

    expect(screen.queryByTestId('fieldDefinitionIdentityNotice')).not.toBeInTheDocument();
  });

  it('does not show the identity notice when editing (the identity panel covers it)', () => {
    const fieldDefinition = {
      fieldDefinitionId: 'fd-1',
      name: 'my_field',
      owner: 'securitySolution' as const,
      definition: VALID_YAML,
      isGlobal: false,
    };

    renderWithTestingProviders(
      <FieldDefinitionFlyout {...defaultProps} fieldDefinition={fieldDefinition} />
    );

    expect(screen.queryByTestId('fieldDefinitionIdentityNotice')).not.toBeInTheDocument();
    expect(screen.getByTestId('fieldDefinitionIdentityPanel')).toBeInTheDocument();
  });

  it('warns when a field is required but has no default value', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: { value: REQUIRED_NO_DEFAULT_YAML },
    });

    const warning = screen.getByTestId('fieldDefinitionRequiredNoDefaultWarning');
    expect(warning).toHaveTextContent('Required field without a default value');
    expect(warning).toHaveTextContent(
      'It will be empty on cases created automatically from any template that includes it'
    );
  });

  it('uses the global copy when the field applies to all cases', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: { value: REQUIRED_NO_DEFAULT_YAML },
    });
    fireEvent.click(screen.getByTestId('fieldDefinitionApplyToAllCasesCheckbox'));

    expect(screen.getByTestId('fieldDefinitionRequiredNoDefaultWarning')).toHaveTextContent(
      'it will be empty on every automatically created case in this space'
    );
  });

  it('does not warn when the required field has a default value', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: {
        value: `name: my_field
label: "My Field"
control: INPUT_TEXT
type: keyword
metadata:
  default: "N/A"
validation:
  required: true
`,
      },
    });

    expect(screen.queryByTestId('fieldDefinitionRequiredNoDefaultWarning')).not.toBeInTheDocument();
  });

  it('does not warn for an optional field', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    expect(screen.queryByTestId('fieldDefinitionRequiredNoDefaultWarning')).not.toBeInTheDocument();
  });

  it('does not block saving — the warning is advisory', () => {
    renderWithTestingProviders(<FieldDefinitionFlyout {...defaultProps} />);

    fireEvent.change(screen.getByTestId('fieldDefinitionYamlInput'), {
      target: { value: REQUIRED_NO_DEFAULT_YAML },
    });

    expect(screen.getByTestId('fieldDefinitionRequiredNoDefaultWarning')).toBeInTheDocument();
    expect(screen.getByTestId('fieldDefinitionSaveButton')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('fieldDefinitionSaveButton'));
    expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'my_field' }));
  });
});
