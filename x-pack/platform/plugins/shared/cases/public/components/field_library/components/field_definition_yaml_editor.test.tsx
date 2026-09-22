/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../../common/mock';

// Shared with the mock factory below; jest hoisting requires the `mock` prefix.
const mockEditor = { fake: 'editor' };

jest.mock('../../templates_v2/components/template_yaml_editor', () => {
  // jest.mock factories are hoisted above imports, so React must be required locally.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactLocal = require('react');
  return {
    TemplateYamlEditorBase: ({
      value,
      onEditorMount,
      onValidationChange,
    }: {
      value: string;
      onEditorMount?: (isMounted: boolean, editor?: unknown) => void;
      onValidationChange?: (errors: unknown[]) => void;
    }) => {
      // Simulate Monaco mounting so the wrapper captures the editor handle.
      ReactLocal.useEffect(() => {
        onEditorMount?.(true, mockEditor);
        onValidationChange?.(
          value === 'name: only_a_name'
            ? [
                {
                  message: 'Missing required properties.',
                  severity: 'error',
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: 1,
                  endColumn: 1,
                },
              ]
            : []
        );
      }, [onEditorMount, onValidationChange, value]);
      return <div data-test-subj="mockYamlEditorBase" />;
    },
  };
});

const mockActionsMenu = jest.fn();
jest.mock('../../templates_v2/components/template_actions_menu', () => ({
  TemplateActionsMenu: (props: Record<string, unknown>) => {
    mockActionsMenu(props);
    return <div data-test-subj="mockActionsMenu" />;
  },
}));

import { FieldDefinitionYamlEditor } from './field_definition_yaml_editor';

describe('FieldDefinitionYamlEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts the actions menu in fieldDefinition mode once the editor is available', async () => {
    const onChange = jest.fn();
    renderWithTestingProviders(
      <FieldDefinitionYamlEditor
        value="control: INPUT_TEXT"
        onChange={onChange}
        data-test-subj="fieldDefinitionYamlInput"
      />
    );

    expect(await screen.findByTestId('mockActionsMenu')).toBeInTheDocument();
    expect(mockActionsMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'fieldDefinition',
        editor: mockEditor,
        value: 'control: INPUT_TEXT',
        onChange,
      })
    );
  });

  it('forwards the data-test-subj to the editor container', () => {
    renderWithTestingProviders(
      <FieldDefinitionYamlEditor
        value=""
        onChange={jest.fn()}
        data-test-subj="fieldDefinitionYamlInput"
      />
    );

    expect(screen.getByTestId('fieldDefinitionYamlInput')).toBeInTheDocument();
  });

  describe('authoring-charset validation split', () => {
    const dashedFieldYaml = 'name: risk-score\ncontrol: INPUT_TEXT\ntype: keyword\n';

    it('shows the charset error for a dashed name when creating', async () => {
      renderWithTestingProviders(
        <FieldDefinitionYamlEditor
          value={dashedFieldYaml}
          onChange={jest.fn()}
          data-test-subj="fieldDefinitionYamlInput"
        />
      );

      expect(await screen.findByText('1 error')).toBeInTheDocument();
      expect(
        screen.getByText(/Field name "risk-score" must contain only letters/)
      ).toBeInTheDocument();
    });

    it('does not show the charset error for a stored dashed name when editing', async () => {
      renderWithTestingProviders(
        <FieldDefinitionYamlEditor
          value={dashedFieldYaml}
          onChange={jest.fn()}
          isEditing
          data-test-subj="fieldDefinitionYamlInput"
        />
      );

      expect(await screen.findByTestId('mockYamlEditorBase')).toBeInTheDocument();
      expect(screen.queryByText(/must contain only letters/)).not.toBeInTheDocument();
      expect(screen.queryByText('1 error')).not.toBeInTheDocument();
    });
  });

  it('prefers the editor schema error when the YAML does not describe an inline field', async () => {
    renderWithTestingProviders(
      <FieldDefinitionYamlEditor
        value="name: only_a_name"
        onChange={jest.fn()}
        data-test-subj="fieldDefinitionYamlInput"
      />
    );

    expect(await screen.findByText('1 error')).toBeInTheDocument();
    expect(screen.getByText('Missing required properties.')).toBeInTheDocument();
    expect(
      screen.queryByText('Complete the required field properties and correct invalid values.')
    ).not.toBeInTheDocument();
  });
});
