/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

type AnyRecord = Record<string, unknown>;

const actual = jest.requireActual('@kbn/code-editor') as AnyRecord;

const getTestSubj = (props: AnyRecord) => {
  const testSubj = props['data-test-subj'];
  return typeof testSubj === 'string' && testSubj.length ? testSubj : 'mockCodeEditor';
};

/**
 * Lightweight CodeEditor replacement for JSDOM tests.
 *
 * Goals:
 * - Avoid Monaco + portals (EuiPortal) warnings and open-handle leaks.
 * - Preserve the module surface by spreading the real module exports.
 * - Provide a stable input surface; tests can assert via `data-test-subj`.
 *
 * Supported onChange shapes:
 * - Simple string: `onChange(<string>)`
 */
const MockedCodeEditor = (props: AnyRecord) => {
  const value = props.value;
  const onChange = props.onChange;

  return (
    <input
      data-test-subj={getTestSubj(props)}
      data-currentvalue={typeof value === 'string' ? value : ''}
      value={typeof value === 'string' ? value : ''}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        if (typeof onChange !== 'function') return;

        const nextValue = e.currentTarget.value ?? e.target.value ?? '';
        // Most call sites expect CodeEditor to behave like an <input /> and pass the text value.
        (onChange as (arg: unknown) => void)(nextValue);
      }}
    />
  );
};

module.exports = {
  ...actual,
  CodeEditor: MockedCodeEditor,
};
