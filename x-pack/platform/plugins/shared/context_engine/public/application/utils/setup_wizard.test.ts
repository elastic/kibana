/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { SetupWizardDoneSteps } from './setup_wizard';
import {
  getSetupWizardDoneSteps,
  getSetupWizardStorageKey,
  getSetupWizardSteps,
  getSetupWizardView,
  isDreamingSetUp,
  parseSetupWizardStoredValue,
  readSetupWizardStoredValue,
  removeSetupWizardStoredValue,
  writeSetupWizardStoredValue,
} from './setup_wizard';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const noneDone: SetupWizardDoneSteps = {
  dreaming: false,
  connect: false,
  sources: false,
  describe: false,
};

const allDone: SetupWizardDoneSteps = {
  dreaming: true,
  connect: true,
  sources: true,
  describe: true,
};

describe('getSetupWizardSteps', () => {
  it('has 4 steps with memory', () => {
    expect(getSetupWizardSteps(true)).toEqual(['dreaming', 'connect', 'sources', 'describe']);
  });

  it('has no dreaming step without memory', () => {
    expect(getSetupWizardSteps(false)).toEqual(['connect', 'sources', 'describe']);
  });
});

describe('parseSetupWizardStoredValue', () => {
  it('keeps a step id and closed', () => {
    expect(parseSetupWizardStoredValue('sources')).toBe('sources');
    expect(parseSetupWizardStoredValue('closed')).toBe('closed');
  });

  it('ignores anything else', () => {
    expect(parseSetupWizardStoredValue('step-2')).toBeUndefined();
    expect(parseSetupWizardStoredValue(undefined)).toBeUndefined();
    expect(parseSetupWizardStoredValue(2)).toBeUndefined();
  });
});

describe('isDreamingSetUp', () => {
  it('is false with no dreaming config', () => {
    expect(isDreamingSetUp(undefined)).toBe(false);
  });

  it('is false when dreaming is off and builds nothing', () => {
    expect(isDreamingSetUp({ enabled: false, facts: [] })).toBe(false);
  });

  it('is true when dreaming is on', () => {
    expect(isDreamingSetUp({ enabled: true })).toBe(true);
  });

  it('is true when dreaming has a fact type', () => {
    expect(
      isDreamingSetUp({ enabled: false, facts: [{ type: 'preference', description: 'A taste' }] })
    ).toBe(true);
  });
});

describe('getSetupWizardDoneSteps', () => {
  it('reads every step from the AI index data', () => {
    expect(getSetupWizardDoneSteps({ aiIndex, memoryCount: 0 })).toEqual(noneDone);
    expect(
      getSetupWizardDoneSteps({
        aiIndex: {
          ...aiIndex,
          dreaming: { enabled: true },
          sources: [{ type: 'index', value: 'logs-*' }],
          description: 'Answers questions about checkouts.',
        },
        memoryCount: 1,
      })
    ).toEqual(allDone);
  });

  it('does not count a blank description', () => {
    expect(
      getSetupWizardDoneSteps({ aiIndex: { ...aiIndex, description: '   ' }, memoryCount: 0 })
        .describe
    ).toBe(false);
  });
});

describe('getSetupWizardView', () => {
  const base = { isManaged: false, isMemoryEnabled: true, done: noneDone, stored: undefined };

  it('opens on the first step that is not done', () => {
    expect(getSetupWizardView({ ...base, done: { ...noneDone, dreaming: true } })).toEqual({
      show: true,
      steps: ['dreaming', 'connect', 'sources', 'describe'],
      initialStep: 'connect',
    });
  });

  it('opens on the stored step, even after an earlier skipped step', () => {
    expect(getSetupWizardView({ ...base, stored: 'sources' })).toMatchObject({
      show: true,
      initialStep: 'sources',
    });
  });

  it('is hidden when the user closed it', () => {
    expect(getSetupWizardView({ ...base, stored: 'closed' })).toEqual({ show: false });
  });

  it('is hidden for a managed AI index', () => {
    expect(getSetupWizardView({ ...base, isManaged: true })).toEqual({ show: false });
  });

  it('is hidden when every step is done', () => {
    expect(getSetupWizardView({ ...base, done: allDone })).toEqual({ show: false });
  });

  it('without memory, has no dreaming step and ignores Connect agent', () => {
    const view = getSetupWizardView({
      ...base,
      isMemoryEnabled: false,
      done: { ...noneDone, sources: true },
    });
    expect(view).toEqual({
      show: true,
      steps: ['connect', 'sources', 'describe'],
      initialStep: 'describe',
    });
  });

  it('without memory, is hidden when sources and description are done', () => {
    expect(
      getSetupWizardView({
        ...base,
        isMemoryEnabled: false,
        done: { ...noneDone, sources: true, describe: true },
      })
    ).toEqual({ show: false });
  });

  it('without memory, ignores a stored dreaming step', () => {
    expect(
      getSetupWizardView({ ...base, isMemoryEnabled: false, stored: 'dreaming' })
    ).toMatchObject({ initialStep: 'sources' });
  });
});

describe('setup wizard storage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('keeps the same AI index id apart in different spaces', () => {
    expect(getSetupWizardStorageKey({ basePath: '', aiIndexId: 'support' })).not.toBe(
      getSetupWizardStorageKey({ basePath: '/s/marketing', aiIndexId: 'support' })
    );

    writeSetupWizardStoredValue({ basePath: '/s/marketing', aiIndexId: 'support' }, 'closed');

    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' })).toBeUndefined();
    expect(readSetupWizardStoredValue({ basePath: '/s/marketing', aiIndexId: 'support' })).toBe(
      'closed'
    );
  });

  it('removes the stored value', () => {
    writeSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' }, 'sources');
    removeSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' });

    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' })).toBeUndefined();
  });

  it('keeps the value in memory when local storage is blocked', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    writeSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' }, 'describe');

    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' })).toBe('describe');
    setItem.mockRestore();
    removeSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' });
    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'blocked' })).toBeUndefined();
  });

  it('ignores a value it cannot read', () => {
    window.localStorage.setItem(
      getSetupWizardStorageKey({ basePath: '', aiIndexId: 'support' }),
      '{not json'
    );

    expect(readSetupWizardStoredValue({ basePath: '', aiIndexId: 'support' })).toBeUndefined();
  });
});
