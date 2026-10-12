/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSubjectTitle } from './subject_title';

describe('getSubjectTitle', () => {
  it('names an alert after its rule, else its summary, else its id', () => {
    expect(
      getSubjectTitle({ type: 'alert', id: 'a-1', summary: 'x', snapshot: { rule_name: 'Rule' } })
    ).toBe('Rule');
    expect(getSubjectTitle({ type: 'alert', id: 'a-1', summary: 'Latency' })).toBe('Latency');
    expect(getSubjectTitle({ type: 'alert', id: 'a-1' })).toBe('a-1');
  });

  it('names a Slack thread after its question, else its channel', () => {
    const slack = { channel: 'oncall', thread_ts: '1' };
    expect(getSubjectTitle({ type: 'slack_thread', id: 't', summary: 'Why?', slack })).toBe('Why?');
    expect(getSubjectTitle({ type: 'slack_thread', id: 't', slack })).toBe('#oncall');
    expect(getSubjectTitle({ type: 'slack_thread', id: 't' })).toBe('Slack');
  });

  it('names a question or significant event after its summary, else its type', () => {
    expect(getSubjectTitle({ type: 'manual', id: 'q', summary: 'Why is it slow?' })).toBe(
      'Why is it slow?'
    );
    expect(getSubjectTitle({ type: 'manual', id: 'q' })).toBe('Question');
    expect(getSubjectTitle({ type: 'significant_event', id: 'e' })).toBe('Significant event');
  });
});
