/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebouncedTemplateTextField } from './debounced_template_text_field';

/**
 * Stands in for the template editor: it accepts a new value and hands it back down only after a
 * round-trip delay, the way the real parent re-serializes to YAML, re-parses, and re-renders.
 */
const RoundTrippingParent: React.FC<{ roundTripMs: number; commitOnChange?: boolean }> = ({
  roundTripMs,
  commitOnChange = true,
}) => {
  const [value, setValue] = useState('');

  const onChange = useCallback(
    (next: string) => {
      setTimeout(() => setValue(next), roundTripMs);
    },
    [roundTripMs]
  );

  return (
    <DebouncedTemplateTextField
      label="Name"
      value={value}
      onChange={onChange}
      commitOnChange={commitOnChange}
      dataTestSubj="templateMetadataNameInput"
    />
  );
};

describe('DebouncedTemplateTextField', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * The jitter is an *intermediate* state, not a final one: the parent's echoes arrive in order, so
   * the input converges on the right text either way. What the user sees is the input snapping back
   * to an earlier, shorter value the moment a stale echo lands mid-word. So the assertion has to be
   * made after the first stale echo and before the rest — not at the end.
   */
  it('ignores an echo of an earlier keystroke that lands while the user is still typing', () => {
    render(<RoundTrippingParent roundTripMs={100} />);
    const input = screen.getByTestId('templateMetadataNameInput') as HTMLInputElement;

    fireEvent.focus(input);

    // t=0: type "S". The parent will hand "S" back at t=100.
    fireEvent.change(input, { target: { value: 'S' } });

    // t=50: type "e" before that echo has landed.
    act(() => {
      jest.advanceTimersByTime(50);
    });
    fireEvent.change(input, { target: { value: 'Se' } });

    // t=110: the echo of "S" arrives, but the input already holds "Se". Adopting it here is
    // precisely the bug — the word would visibly lose its last character and the caret would jump.
    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(input).toHaveValue('Se');
  });

  it('still converges on the typed value once every echo has landed', () => {
    render(<RoundTrippingParent roundTripMs={100} />);
    const input = screen.getByTestId('templateMetadataNameInput') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'S' } });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    fireEvent.change(input, { target: { value: 'Sev1' } });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(input).toHaveValue('Sev1');
  });

  it('adopts an outside change while the field is not focused', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <DebouncedTemplateTextField
        label="Name"
        value="from yaml"
        onChange={onChange}
        dataTestSubj="templateMetadataNameInput"
      />
    );

    expect(screen.getByTestId('templateMetadataNameInput')).toHaveValue('from yaml');

    rerender(
      <DebouncedTemplateTextField
        label="Name"
        value="edited directly in yaml"
        onChange={onChange}
        dataTestSubj="templateMetadataNameInput"
      />
    );

    expect(screen.getByTestId('templateMetadataNameInput')).toHaveValue('edited directly in yaml');
  });

  it('commits the pending value on blur', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onChange = jest.fn();

    render(
      <DebouncedTemplateTextField
        label="Name"
        value=""
        onChange={onChange}
        dataTestSubj="templateMetadataNameInput"
      />
    );

    const input = screen.getByTestId('templateMetadataNameInput');
    await user.click(input);
    await user.type(input, 'Draft');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith('Draft');
  });
});
