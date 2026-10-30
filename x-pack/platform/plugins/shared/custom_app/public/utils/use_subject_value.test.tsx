/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useSubjectValue } from './use_subject_value';

describe('useSubjectValue', () => {
  it('gives the value of the subject, and follows it', () => {
    const subject = new BehaviorSubject('first');
    const { result } = renderHook(() => useSubjectValue(subject));
    expect(result.current).toBe('first');

    act(() => subject.next('second'));

    expect(result.current).toBe('second');
  });

  it('follows a different subject when it is given one, which is what makes it worth having', () => {
    const before = new BehaviorSubject('loading');
    const after = new BehaviorSubject('loading');
    const { result, rerender } = renderHook(({ subject }) => useSubjectValue(subject), {
      initialProps: { subject: before },
    });

    rerender({ subject: after });
    act(() => after.next('done'));

    expect(result.current).toBe('done');
  });

  it('stops listening to the subject it left', () => {
    const before = new BehaviorSubject(1);
    const after = new BehaviorSubject(10);
    const { result, rerender } = renderHook(({ subject }) => useSubjectValue(subject), {
      initialProps: { subject: before },
    });
    rerender({ subject: after });

    act(() => before.next(2));

    expect(result.current).toBe(10);
    expect(before.observed).toBe(false);
  });

  it('stops listening when it goes away', () => {
    const subject = new BehaviorSubject(1);
    const { unmount } = renderHook(() => useSubjectValue(subject));
    expect(subject.observed).toBe(true);

    unmount();

    expect(subject.observed).toBe(false);
  });
});
