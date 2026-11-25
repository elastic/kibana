/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { LensSerializedState } from '@kbn/lens-common';
import { getLensApiMock } from '../../react_embeddable/mocks';
import { createOpenInLensAction } from './open_in_lens_action';
import { ACTION_OPEN_IN_LENS } from './constants';

const attributes = { title: 'chart' } as LensSerializedState['attributes'];
const timeRange = { from: 'now-15m', to: 'now' };

const getEmbeddable = (panelTimeRange?: typeof timeRange) =>
  ({
    ...getLensApiMock(),
    canViewUnderlyingData$: new BehaviorSubject(true),
    timeRange$: new BehaviorSubject(panelTimeRange),
    getLegacySerializedState: () => ({ attributes }),
    parentApi: { timeRange$: new BehaviorSubject(timeRange) },
  } as unknown as EmbeddableApiContext['embeddable']);

const toContext = (embeddable: EmbeddableApiContext['embeddable']) =>
  ({ embeddable } as ActionExecutionContext<EmbeddableApiContext>);

describe('open in Lens action', () => {
  const navigateToPrefilledEditor = jest.fn();
  const createAction = (canUseEditor = true, onExecute?: () => void) =>
    createOpenInLensAction(
      {
        application: { capabilities: { visualize_v2: { show: canUseEditor } } } as never,
        navigateToPrefilledEditor,
      },
      { onExecute }
    );

  beforeEach(() => jest.clearAllMocks());

  it('has the open in Lens id', () => {
    expect(createAction().id).toBe(ACTION_OPEN_IN_LENS);
  });

  it('is compatible when the user can use Lens', async () => {
    expect(await createAction().isCompatible(toContext(getEmbeddable()))).toBe(true);
  });

  it('is incompatible when the user cannot use Lens', async () => {
    expect(await createAction(false).isCompatible(toContext(getEmbeddable()))).toBe(false);
  });

  it('is incompatible with non-lens embeddables', async () => {
    expect(await createAction().isCompatible(toContext({ type: 'NOT_LENS' } as never))).toBe(false);
  });

  it('opens the chart in the editor with the time range of the renderer', async () => {
    await createAction().execute(toContext(getEmbeddable()));

    expect(navigateToPrefilledEditor).toHaveBeenCalledWith(
      { attributes, time_range: timeRange },
      { openInNewTab: undefined }
    );
  });

  it('opens the editor in a new tab when asked to', async () => {
    const action = createOpenInLensAction(
      {
        application: { capabilities: { visualize_v2: { show: true } } } as never,
        navigateToPrefilledEditor,
      },
      { openInNewTab: true }
    );

    await action.execute(toContext(getEmbeddable()));

    expect(navigateToPrefilledEditor).toHaveBeenCalledWith(expect.anything(), {
      openInNewTab: true,
    });
  });

  it('prefers the panel time range over the one of the renderer', async () => {
    const panelTimeRange = { from: 'now-1h', to: 'now' };

    await createAction().execute(toContext(getEmbeddable(panelTimeRange)));

    expect(navigateToPrefilledEditor).toHaveBeenCalledWith(
      { attributes, time_range: panelTimeRange },
      expect.anything()
    );
  });

  it('calls onExecute when the action runs', async () => {
    const onExecute = jest.fn();

    await createAction(true, onExecute).execute(toContext(getEmbeddable()));

    expect(onExecute).toHaveBeenCalledTimes(1);
  });
});
