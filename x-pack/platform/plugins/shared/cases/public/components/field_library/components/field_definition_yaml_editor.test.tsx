/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Shared with the mock factory below; jest hoisting requires the `mock` prefix.
const mockEditor = { fake: 'editor' };

jest.mock('../../templates_v2/components/template_yaml_editor', () => {
  // jest.mock factories are hoisted above imports, so React must be required locally.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactLocal = require('react');
  return {
    TemplateYamlEditorBase: ({
      onEditorMount,
    }: {
      onEditorMount?: (isMounted: boolean, editor?: unknown) => void;
    }) => {
      // Simulate Monaco mounting so the wrapper captures the editor handle.
      ReactLocal.useEffect(() => {
        onEditorMount?.(true, mockEditor);
      }, [onEditorMount]);
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
    render(
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
    render(
      <FieldDefinitionYamlEditor
        value=""
        onChange={jest.fn()}
        data-test-subj="fieldDefinitionYamlInput"
      />
    );

    expect(screen.getByTestId('fieldDefinitionYamlInput')).toBeInTheDocument();
  });
});
