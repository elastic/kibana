/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { parseDocument } from 'yaml';
import { I18nProvider } from '@kbn/i18n-react';
import { StepErrorHandlingSection } from './step_error_handling_section';
import { parseStepFragment } from '../lib/parse_step_fragment';

const RETRYING =
  'name: n\ntype: console\non-failure:\n  retry:\n    max-attempts: 3\n    delay: 5s\n';

/** The section as the panel mounts it: the fragment lives in state and is parsed on every change. */
const Harness = ({ onWrite }: { onWrite: (fragment: string) => void }) => {
  const [fragment, setFragment] = useState(RETRYING);
  return (
    <I18nProvider>
      <StepErrorHandlingSection
        fragment={fragment}
        onFailureValue={parseStepFragment(fragment).read(['on-failure'])}
        indent={2}
        onFragmentChange={(next) => {
          onWrite(next);
          setFragment(next);
        }}
      />
    </I18nProvider>
  );
};

const retryIn = (fragment: string): unknown =>
  (parseDocument(fragment).toJS() as { 'on-failure': { retry: unknown } })['on-failure'].retry;

const setup = () => {
  const onWrite = jest.fn();
  render(<Harness onWrite={onWrite} />);
  return {
    delay: screen.getByTestId('workflowStepConfigErrorDelay') as HTMLInputElement,
    maxAttempts: screen.getByTestId('workflowStepConfigErrorMaxAttempts') as HTMLInputElement,
    lastWritten: () => onWrite.mock.calls.at(-1)?.[0] as string,
    writes: () => onWrite.mock.calls.length,
  };
};

describe('StepErrorHandlingSection retry controls', () => {
  describe('Delay', () => {
    it('can be emptied while typing, without writing a delay the user did not choose', () => {
      const { delay, writes } = setup();

      fireEvent.change(delay, { target: { value: '' } });

      expect(delay).toHaveValue('');
      expect(writes()).toBe(0);
    });

    it('writes what is typed once it is a delay', () => {
      const { delay, lastWritten } = setup();

      fireEvent.change(delay, { target: { value: '' } });
      fireEvent.change(delay, { target: { value: '30s' } });

      expect(delay).toHaveValue('30s');
      expect(retryIn(lastWritten())).toEqual({ 'max-attempts': 3, delay: '30s' });
    });

    it('goes back to the stored delay when left empty', () => {
      const { delay } = setup();

      fireEvent.change(delay, { target: { value: '' } });
      fireEvent.blur(delay);

      expect(delay).toHaveValue('5s');
    });
  });

  describe('Max attempts', () => {
    it('can be emptied while typing, without writing a count the user did not choose', () => {
      const { maxAttempts, writes } = setup();

      fireEvent.change(maxAttempts, { target: { value: '' } });

      expect(maxAttempts).toHaveValue(null);
      expect(writes()).toBe(0);
    });

    it('writes the count once it is one', () => {
      const { maxAttempts, lastWritten } = setup();

      fireEvent.change(maxAttempts, { target: { value: '' } });
      fireEvent.change(maxAttempts, { target: { value: '5' } });

      expect(maxAttempts).toHaveValue(5);
      expect(retryIn(lastWritten())).toEqual({ 'max-attempts': 5, delay: '5s' });
    });

    it('goes back to the stored count when left empty', () => {
      const { maxAttempts } = setup();

      fireEvent.change(maxAttempts, { target: { value: '' } });
      act(() => {
        fireEvent.blur(maxAttempts);
      });

      expect(maxAttempts).toHaveValue(3);
    });
  });
});
