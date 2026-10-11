/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import {
  GENERATE_DASHBOARD_TOOL_ID,
  combineTurnSteps,
  findAskUserQuestionPrompt,
  findModeOptionIndex,
  getAttemptedControls,
  getControlFailures,
  getLastWrittenDashboardId,
  getDashboardFailures,
} from './extract_dashboard';

const generateCall = (
  controls: unknown[],
  data: Record<string, unknown> = { attachment_id: 'dash' }
): Record<string, unknown> => ({
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  params: { panels: [], controls },
  results: [{ type: 'dashboard', data }],
});

describe('extract dashboard helpers', () => {
  it('returns the attachment id of the last successful generate_dashboard call', () => {
    const steps = [
      { type: 'tool_call', tool_id: 'load_skill' },
      generateCall([], { attachment_id: 'first' }),
      generateCall([], { attachment_id: 'second' }),
      { type: 'tool_call', tool_id: GENERATE_DASHBOARD_TOOL_ID, results: [{ type: 'error' }] },
    ];
    expect(getLastWrittenDashboardId(steps)).toBe('second');
    expect(getLastWrittenDashboardId([{ type: 'reasoning' }])).toBeUndefined();
  });

  it('lists attempted controls with their call index and user_requested flag', () => {
    const steps = [
      generateCall([
        {
          type: 'options_list_control',
          field_name: 'status_code',
          index: 'logs',
          user_requested: true,
        },
        { type: 'time_slider_control' },
      ]),
      generateCall([{ type: 'options_list_control', field_name: 'response', index: 'logs' }]),
    ];
    expect(getAttemptedControls(steps)).toEqual([
      { type: 'options_list_control', field: 'status_code', userRequested: true, call: 0 },
      { type: 'time_slider_control', userRequested: false, call: 0 },
      { type: 'options_list_control', field: 'response', userRequested: false, call: 1 },
    ]);
  });

  it('reads reported failures with their call index and keeps the control failures', () => {
    const sent = (field: string) => ({ type: 'options_list_control', field_name: field });
    const steps = [
      generateCall([sent('a')], { attachment_id: 'dash' }),
      generateCall([sent('a'), sent('b'), { type: 'time_slider_control' }], {
        attachment_id: 'dash',
        failures: [
          { type: 'upsert_dashboard', identifier: 'a, b', error: 'Not mapped on index "logs".' },
          { type: 'upsert_dashboard', identifier: 'panel-1', error: 'boom' },
          { type: 'upsert_dashboard', identifier: 'controls[2]', error: 'One time slider.' },
          { type: 'upsert_dashboard', identifier: 3 },
        ],
      }),
    ];
    expect(getDashboardFailures(steps)).toHaveLength(3);
    expect(getControlFailures(steps)).toEqual([
      {
        type: 'upsert_dashboard',
        identifier: 'a, b',
        error: 'Not mapped on index "logs".',
        call: 1,
      },
      { type: 'upsert_dashboard', identifier: 'controls[2]', error: 'One time slider.', call: 1 },
    ]);
  });

  it('finds the ask_user_question prompt and the option for each mode', () => {
    const prompt = {
      type: AgentPromptType.ask_user_question,
      id: 'p1',
      questions: [
        {
          question: 'How would you like to enhance this dashboard?',
          options: [
            { label: 'Appearance and content' },
            { label: 'Appearance only (no content changes)' },
          ],
        },
      ],
    };
    expect(findAskUserQuestionPrompt([{ type: 'other' }, prompt])).toBe(prompt);
    const { options } = prompt.questions[0];
    expect(findModeOptionIndex(options, 'appearance')).toBe(1);
    expect(findModeOptionIndex(options, 'content')).toBe(0);
    expect(
      findModeOptionIndex([{ label: 'Appearance only' }, { label: 'Everything' }], 'content')
    ).toBe(-1);
  });
});

describe('combineTurnSteps', () => {
  const call = (id: string) => ({ type: 'tool_call', tool_id: 'load_skill', tool_call_id: id });

  it('keeps the answer turn alone when it already reports the opening tool calls', () => {
    const opening = [call('a'), call('b')];
    const answer = [call('a'), call('b'), call('c')];
    expect(combineTurnSteps(opening, answer)).toEqual(answer);
  });

  it('joins both turns when the answer turn reports only its own steps', () => {
    expect(combineTurnSteps([call('a')], [call('c')])).toEqual([call('a'), call('c')]);
  });
});
