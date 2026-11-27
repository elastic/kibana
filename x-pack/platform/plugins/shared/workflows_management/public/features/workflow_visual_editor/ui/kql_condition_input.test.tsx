/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { z } from '@kbn/zod/v4';
import { KqlConditionInput } from './kql_condition_input';
import { getKqlSuggestionsForEventSchema } from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/trigger_condition/get_trigger_condition_kql_suggestions';

const mockProviders: Array<{
  language: string;
  provider: {
    provideCompletionItems: (
      model: unknown,
      position: unknown
    ) => Promise<{ suggestions: unknown[] }>;
  };
  dispose: jest.Mock;
}> = [];

jest.mock('@kbn/monaco', () => ({
  monaco: {
    languages: {
      getLanguages: () => [],
      register: jest.fn(),
      registerCompletionItemProvider: (language: string, provider: unknown) => {
        const entry = { language, provider, dispose: jest.fn() };
        mockProviders.push(entry as (typeof mockProviders)[number]);
        return entry;
      },
    },
  },
}));

const mockEditor = { getModel: jest.fn(), addCommand: jest.fn(), onDidBlurEditorText: jest.fn() };
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: (props: {
    value: string;
    onChange?: (v: string) => void;
    dataTestSubj?: string;
    placeholder?: string;
    editorDidMount?: (editor: unknown) => void;
  }) => {
    return (
      <textarea
        ref={(element) => {
          if (element) props.editorDidMount?.(mockEditor);
        }}
        data-test-subj={props.dataTestSubj}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    );
  },
}));
jest.mock('@kbn/workflows-ui', () => ({ workflowsEditorChromeOverrides: {} }));

const mockKql = { autocomplete: {} };
const mockFieldFormats = {};
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { kql: mockKql, fieldFormats: mockFieldFormats } }),
}));
jest.mock(
  '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/trigger_condition/get_trigger_condition_kql_suggestions',
  () => ({ getKqlSuggestionsForEventSchema: jest.fn(async () => [{ label: 'body.action' }]) })
);

const eventSchema = z.object({ body: z.object({ action: z.string() }) });

const setup = (props: Partial<React.ComponentProps<typeof KqlConditionInput>> = {}) => {
  const onChange = jest.fn();
  render(
    <KqlConditionInput
      value=""
      onChange={onChange}
      eventSchema={eventSchema}
      ariaLabel="Condition"
      placeholder="Type a KQL condition"
      testSubj="cond"
      {...props}
    />
  );
  return { onChange };
};

describe('KqlConditionInput', () => {
  beforeEach(() => {
    mockProviders.length = 0;
    jest.clearAllMocks();
  });

  it('reports typed text, line breaks included', () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByTestId('cond'), { target: { value: 'a: 1\nand b: 2' } });

    expect(onChange).toHaveBeenCalledWith('a: 1\nand b: 2');
  });

  it('shows the placeholder only while empty', () => {
    setup();
    expect(screen.getByTestId('cond')).toHaveAttribute('placeholder', 'Type a KQL condition');
  });

  it('suggests from the trigger event, for the model of its own editor only', async () => {
    setup();
    const own = { getValue: () => 'body.', getOffsetAt: () => 5 };
    mockEditor.getModel.mockReturnValue(own);
    const [{ provider }] = mockProviders;

    const result = await provider.provideCompletionItems(own, { lineNumber: 1, column: 6 });
    const other = await provider.provideCompletionItems(
      { getValue: () => '', getOffsetAt: () => 0 },
      { lineNumber: 1, column: 1 }
    );

    expect(result.suggestions).toEqual([{ label: 'body.action' }]);
    expect(other.suggestions).toEqual([]);
    expect(getKqlSuggestionsForEventSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        kql: 'body.',
        caretInKql: 5,
        contentStartInModel: 0,
        eventSchema,
        model: own,
      })
    );
  });

  it('offers no suggestions provider when the trigger has no event schema', () => {
    setup({ eventSchema: undefined });
    expect(mockProviders).toHaveLength(0);
  });

  it('drops its provider when it goes away', () => {
    const { unmount } = render(
      <KqlConditionInput
        value=""
        onChange={jest.fn()}
        eventSchema={eventSchema}
        ariaLabel="Condition"
        testSubj="cond"
      />
    );
    const [{ dispose }] = mockProviders;

    unmount();

    expect(dispose).toHaveBeenCalled();
  });
});
