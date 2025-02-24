/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import '@kbn/code-editor-mock/jest_helper';

import { CodeEditorField } from '@kbn/code-editor';
import type { monaco } from '@kbn/monaco';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { JSONRuleEditor } from './json_rule_editor';
import { AllRule, AnyRule, ExceptAllRule, ExceptAnyRule, FieldRule } from '../../model';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn().mockReturnValue({
    services: { docLinks: { links: { apis: { createRoleMapping: 'createRoleMappingLink' } } } },
  }),
  useDarkMode: jest.fn().mockReturnValue(false),
}));

describe('JSONRuleEditor', () => {
  const mockChangeEvent = {} as monaco.editor.IModelContentChangedEvent;
  const renderView = (props: React.ComponentProps<typeof JSONRuleEditor>) => {
    return shallowWithIntl(<JSONRuleEditor {...props} />);
  };

  it('renders an empty rule set', () => {
    const props = { rules: null, onChange: jest.fn(), onValidityChange: jest.fn() };
    const wrapper = renderView(props);

    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onValidityChange).not.toHaveBeenCalled();

    wrapper.update();
    expect(wrapper.find(CodeEditorField).props().value).toMatchInlineSnapshot(`"{}"`);
  });

  it('renders a rule set', () => {
    const props = {
      rules: new AllRule([
        new AnyRule([new FieldRule('username', '*')]),
        new ExceptAnyRule([
          new FieldRule('metadata.foo.bar', '*'),
          new AllRule([new FieldRule('realm.name', 'special-one')]),
        ]),
        new ExceptAllRule([new FieldRule('realm.name', '*')]),
      ]),
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
    };
    const wrapper = renderView(props);

    const { value } = wrapper.find(CodeEditorField).props();
    expect(JSON.parse(value as string)).toEqual({
      all: [
        {
          any: [{ field: { username: '*' } }],
        },
        {
          except: {
            any: [
              { field: { 'metadata.foo.bar': '*' } },
              {
                all: [{ field: { ['realm.name']: 'special-one' } }],
              },
            ],
          },
        },
        {
          except: {
            all: [{ field: { ['realm.name']: '*' } }],
          },
        },
      ],
    });
  });

  it('notifies when input contains invalid JSON', () => {
    const props = { rules: null, onChange: jest.fn(), onValidityChange: jest.fn() };
    const wrapper = renderView(props);

    const allRule = JSON.stringify(new AllRule().toRaw());
    act(() => {
      wrapper.find(CodeEditorField).props().onChange!(
        allRule + ', this makes invalid JSON',
        mockChangeEvent
      );
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(false);
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('notifies when input contains an invalid rule set, even if it is valid JSON', () => {
    const props = { rules: null, onChange: jest.fn(), onValidityChange: jest.fn() };
    const wrapper = renderView(props);

    const invalidRule = JSON.stringify({
      all: [
        {
          field: {
            foo: {},
          },
        },
      ],
    });

    act(() => {
      wrapper.find(CodeEditorField).props().onChange!(invalidRule, mockChangeEvent);
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(false);
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('fires onChange when a valid rule set is provided after being previously invalidated', () => {
    const props = { rules: null, onChange: jest.fn(), onValidityChange: jest.fn() };
    const wrapper = renderView(props);

    const allRule = JSON.stringify(new AllRule().toRaw());
    act(() => {
      wrapper.find(CodeEditorField).props().onChange!(
        allRule + ', this makes invalid JSON',
        mockChangeEvent
      );
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(false);
    expect(props.onChange).not.toHaveBeenCalled();

    props.onValidityChange.mockReset();

    act(() => {
      wrapper.find(CodeEditorField).props().onChange!(allRule, mockChangeEvent);
    });

    expect(props.onValidityChange).toHaveBeenCalledTimes(1);
    expect(props.onValidityChange).toHaveBeenCalledWith(true);

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [updatedRule] = props.onChange.mock.calls[0];
    expect(JSON.stringify(updatedRule.toRaw())).toEqual(allRule);
  });

  it('can render a readonly view', () => {
    const props = {
      rules: new AllRule([
        new AnyRule([new FieldRule('username', '*')]),
        new ExceptAnyRule([
          new FieldRule('metadata.foo.bar', '*'),
          new AllRule([new FieldRule('realm.name', 'special-one')]),
        ]),
        new ExceptAllRule([new FieldRule('realm.name', '*')]),
      ]),
      onChange: jest.fn(),
      onValidityChange: jest.fn(),
      readOnly: true,
    };
    const wrapper = renderView(props);

    // The code editor is read-only
    const codeEditors = wrapper.find(CodeEditorField);
    expect(codeEditors).toHaveLength(1);
    expect(codeEditors.at(0).props().options).not.toBeUndefined();
    expect(codeEditors.at(0).props().options?.readOnly).toBeTruthy();
    expect(codeEditors.at(0).props().options?.domReadOnly).toBeTruthy();

    // No reformat button
    expect(wrapper.find('EuiButton[data-test-subj="roleMappingsJSONReformatButton"]')).toHaveLength(
      0
    );
  });
});
