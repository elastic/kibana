/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { LensBuiltInActionId, LensSerializedState } from '@kbn/lens-common';
import { getLensApiMock } from '../../react_embeddable/mocks';
import { createOpenInLensAction } from './open_in_lens_action';
import { ACTION_OPEN_IN_LENS } from './constants';

const attributes = { title: 'chart' } as LensSerializedState['attributes'];
const timeRange = { from: 'now-15m', to: 'now' };

const getEmbeddable = (builtInActions?: LensBuiltInActionId[], onBuiltInAction = jest.fn()) =>
  ({
    ...getLensApiMock(),
    canViewUnderlyingData$: new BehaviorSubject(true),
    timeRange$: new BehaviorSubject(timeRange),
    getLegacySerializedState: () => ({ attributes }),
    parentApi: {
      builtInActionIds$: new BehaviorSubject(builtInActions),
      onBuiltInAction,
    },
  } as unknown as EmbeddableApiContext['embeddable']);

const toContext = (embeddable: EmbeddableApiContext['embeddable']) =>
  ({ embeddable } as ActionExecutionContext<EmbeddableApiContext>);

describe('open in Lens action', () => {
  const navigateToPrefilledEditor = jest.fn();
  const createAction = (canUseEditor = true) =>
    createOpenInLensAction({
      application: { capabilities: { visualize_v2: { show: canUseEditor } } } as never,
      navigateToPrefilledEditor,
    });

  beforeEach(() => jest.clearAllMocks());

  it('has the open in Lens id', () => {
    expect(createAction().id).toBe(ACTION_OPEN_IN_LENS);
  });

  it('is compatible when the renderer requested it and the user can use Lens', async () => {
    expect(await createAction().isCompatible(toContext(getEmbeddable(['openInLens'])))).toBe(true);
  });

  it('is incompatible when the renderer did not request it', async () => {
    expect(await createAction().isCompatible(toContext(getEmbeddable()))).toBe(false);
    expect(await createAction().isCompatible(toContext(getEmbeddable(['saveToDashboard'])))).toBe(
      false
    );
  });

  it('is incompatible when the user cannot use Lens', async () => {
    expect(await createAction(false).isCompatible(toContext(getEmbeddable(['openInLens'])))).toBe(
      false
    );
  });

  it('is incompatible with non-lens embeddables', async () => {
    expect(await createAction().isCompatible(toContext({ type: 'NOT_LENS' } as never))).toBe(false);
  });

  it('opens the chart in the editor with the current time range', async () => {
    await createAction().execute(toContext(getEmbeddable(['openInLens'])));

    expect(navigateToPrefilledEditor).toHaveBeenCalledWith({ attributes, time_range: timeRange });
  });

  it('notifies the renderer', async () => {
    const onBuiltInAction = jest.fn();
    await createAction().execute(toContext(getEmbeddable(['openInLens'], onBuiltInAction)));

    expect(onBuiltInAction).toHaveBeenCalledWith('openInLens');
  });
});
