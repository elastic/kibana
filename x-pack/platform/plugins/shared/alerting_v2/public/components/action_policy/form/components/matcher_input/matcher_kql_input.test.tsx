/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Query } from '@kbn/es-query';
import { MATCHER_CONTEXT_FIELDS } from '@kbn/alerting-v2-schemas';
import { MatcherInput } from './matcher_kql_input';

const mockQueryStringInput = jest.fn((props: Record<string, unknown>) => (
  <input
    data-test-subj={props.dataTestSubj as string}
    value={(props.query as Query).query as string}
    onChange={(e) => {
      const onChange = props.onChange as (q: Query) => void;
      onChange({ query: e.target.value, language: 'kuery' });
    }}
    placeholder={props.placeholder as string}
  />
));

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn(() => ({
    QueryStringInput: (props: Record<string, unknown>) => mockQueryStringInput(props),
  })),
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: jest.fn((name: string) => `PluginStart(${name})`),
}));

describe('MatcherInput', () => {
  beforeEach(() => {
    mockQueryStringInput.mockClear();
  });

  it('renders QueryStringInput with the correct value', () => {
    render(
      <MatcherInput
        value='episode_status : "active"'
        onChange={jest.fn()}
        data-test-subj="matcherInput"
      />
    );

    expect(screen.getByTestId('matcherInput')).toHaveValue('episode_status : "active"');
  });

  it('passes a synthetic DataView built from MATCHER_CONTEXT_FIELDS', () => {
    render(<MatcherInput value="" onChange={jest.fn()} />);

    const { indexPatterns } = mockQueryStringInput.mock.calls[0][0] as {
      indexPatterns: Array<{ fields: Array<{ name: string }> }>;
    };

    expect(indexPatterns).toHaveLength(1);
    expect(indexPatterns[0].fields).toHaveLength(MATCHER_CONTEXT_FIELDS.length);
    expect(indexPatterns[0].fields.map((f: { name: string }) => f.name)).toEqual(
      MATCHER_CONTEXT_FIELDS.map((f) => f.path)
    );
  });

  it('disables the language switcher and uses kuery language', () => {
    render(<MatcherInput value="" onChange={jest.fn()} />);

    const props = mockQueryStringInput.mock.calls[0][0];
    expect(props.disableLanguageSwitcher).toBe(true);
    expect((props.query as Query).language).toBe('kuery');
  });

  it('calls onChange with the query string when QueryStringInput changes', () => {
    const onChange = jest.fn();
    render(<MatcherInput value="" onChange={onChange} data-test-subj="matcherInput" />);

    const input = screen.getByTestId('matcherInput');
    input.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    nativeInputValueSetter.call(input, 'rule.name : "test"');
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith('rule.name : "test"');
  });

  it('passes placeholder and data-test-subj props through', () => {
    render(
      <MatcherInput value="" onChange={jest.fn()} placeholder="Type KQL" data-test-subj="myInput" />
    );

    const props = mockQueryStringInput.mock.calls[0][0];
    expect(props.placeholder).toBe('Type KQL');
    expect(props.dataTestSubj).toBe('myInput');
  });

  it('sets appName to alertingV2', () => {
    render(<MatcherInput value="" onChange={jest.fn()} />);

    const props = mockQueryStringInput.mock.calls[0][0];
    expect(props.appName).toBe('alertingV2');
  });
});
