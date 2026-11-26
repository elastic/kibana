/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { SetupWizardProgress, SetupWizardStepRules } from './setup_wizard_view';
import { getDoneStepIds, getSetupWizardView } from './setup_wizard_view';

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

const progress: SetupWizardProgress = {
  aiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
};

const createStep = ({
  id,
  isDone = false,
  isAvailable,
  isOptional,
}: {
  id: string;
  isDone?: boolean;
  isAvailable?: boolean;
  isOptional?: boolean;
}): SetupWizardStepRules => ({
  id,
  isDone: () => isDone,
  ...(isAvailable !== undefined && { isAvailable: () => isAvailable }),
  ...(isOptional !== undefined && { isOptional }),
});

const getStepIds = (view: ReturnType<typeof getSetupWizardView>) =>
  view.show ? view.steps.map(({ id }) => id) : undefined;

describe('getSetupWizardView', () => {
  it('opens on the first step that is not done', () => {
    const steps = [createStep({ id: 'a', isDone: true }), createStep({ id: 'b' })];

    expect(getSetupWizardView({ steps, progress, stored: undefined })).toEqual({
      show: true,
      steps,
      initialStepId: 'b',
    });
  });

  it('opens on the stored step, even after an earlier step that is not done', () => {
    const steps = [createStep({ id: 'a' }), createStep({ id: 'b' })];

    expect(getSetupWizardView({ steps, progress, stored: 'b' })).toMatchObject({
      initialStepId: 'b',
    });
  });

  it('ignores a stored step that no longer exists', () => {
    const steps = [createStep({ id: 'a' })];

    expect(getSetupWizardView({ steps, progress, stored: 'removed' })).toMatchObject({
      initialStepId: 'a',
    });
  });

  it('is hidden when the user closed it', () => {
    const steps = [createStep({ id: 'a' })];

    expect(getSetupWizardView({ steps, progress, stored: 'closed' })).toEqual({ show: false });
  });

  it('is hidden for a managed AI index', () => {
    const steps = [createStep({ id: 'a' })];
    const managedProgress = { ...progress, aiIndex: { ...aiIndex, managed: true } };

    expect(getSetupWizardView({ steps, progress: managedProgress, stored: undefined })).toEqual({
      show: false,
    });
  });

  it('is hidden when every required step is done, even with optional steps not done', () => {
    const steps = [
      createStep({ id: 'a', isDone: true }),
      createStep({ id: 'b', isOptional: true }),
    ];

    expect(getSetupWizardView({ steps, progress, stored: undefined })).toEqual({ show: false });
  });

  it('may open on an optional step that is not done', () => {
    const steps = [createStep({ id: 'a', isOptional: true }), createStep({ id: 'b' })];

    expect(getSetupWizardView({ steps, progress, stored: undefined })).toMatchObject({
      initialStepId: 'a',
    });
  });

  it('leaves out steps that are not available, also as the stored step', () => {
    const steps = [createStep({ id: 'a', isAvailable: false }), createStep({ id: 'b' })];
    const view = getSetupWizardView({ steps, progress, stored: 'a' });

    expect(getStepIds(view)).toEqual(['b']);
    expect(view).toMatchObject({ initialStepId: 'b' });
  });

  it('is hidden when the only step that is not done is not available', () => {
    const steps = [
      createStep({ id: 'a', isAvailable: false }),
      createStep({ id: 'b', isDone: true }),
    ];

    expect(getSetupWizardView({ steps, progress, stored: undefined })).toEqual({ show: false });
  });
});

describe('getDoneStepIds', () => {
  it('lists the steps that are done', () => {
    const steps = [createStep({ id: 'a', isDone: true }), createStep({ id: 'b' })];

    expect(getDoneStepIds(steps, progress)).toEqual(new Set(['a']));
  });
});
