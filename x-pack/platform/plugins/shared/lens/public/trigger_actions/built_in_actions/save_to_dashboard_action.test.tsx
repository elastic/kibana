/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen } from '@testing-library/react';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { LensBuiltInActionId, LensSerializedState } from '@kbn/lens-common';
import { getLensApiMock } from '../../react_embeddable/mocks';
import { createSaveToDashboardAction } from './save_to_dashboard_action';
import { ACTION_SAVE_TO_DASHBOARD } from './constants';

const mockSaveModal = jest.fn((_props: unknown) => <div data-test-subj="saveModal" />);
jest.mock('../../app_plugin/shared/saved_modal_lazy', () => ({
  getSaveModalComponent: () => (props: unknown) => mockSaveModal(props),
}));
jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: React.ReactElement) => (element: HTMLElement) => {
    const { unmount } = render(node, { container: element });
    return unmount;
  },
}));

const attributes = { title: 'chart' } as LensSerializedState['attributes'];
const timeRange = { from: 'now-15m', to: 'now' };

const getEmbeddable = (builtInActions?: LensBuiltInActionId[], onBuiltInAction = jest.fn()) =>
  ({
    ...getLensApiMock(),
    canViewUnderlyingData$: new BehaviorSubject(true),
    timeRange$: new BehaviorSubject(undefined),
    getLegacySerializedState: () => ({ attributes }),
    parentApi: {
      builtInActionIds$: new BehaviorSubject(builtInActions),
      timeRange$: new BehaviorSubject(timeRange),
      onBuiltInAction,
      telemetrySource: 'chat',
    },
  } as unknown as EmbeddableApiContext['embeddable']);

const toContext = (embeddable: EmbeddableApiContext['embeddable']) =>
  ({ embeddable } as ActionExecutionContext<EmbeddableApiContext>);

describe('save to dashboard action', () => {
  const createAction = (showWriteControls = true) =>
    createSaveToDashboardAction(
      { application: { capabilities: { dashboard_v2: { showWriteControls } } } } as never,
      {} as never
    );

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('has the save to dashboard id', () => {
    expect(createAction().id).toBe(ACTION_SAVE_TO_DASHBOARD);
  });

  it('is compatible when the renderer requested it and the user can write dashboards', async () => {
    expect(await createAction().isCompatible(toContext(getEmbeddable(['saveToDashboard'])))).toBe(
      true
    );
  });

  it('is incompatible when the renderer did not request it', async () => {
    expect(await createAction().isCompatible(toContext(getEmbeddable()))).toBe(false);
    expect(await createAction().isCompatible(toContext(getEmbeddable(['openInLens'])))).toBe(false);
  });

  it('is incompatible when the user cannot write dashboards', async () => {
    expect(
      await createAction(false).isCompatible(toContext(getEmbeddable(['saveToDashboard'])))
    ).toBe(false);
  });

  it('opens the save modal with the chart state and closes it', async () => {
    const onBuiltInAction = jest.fn();
    await createAction().execute(toContext(getEmbeddable(['saveToDashboard'], onBuiltInAction)));

    expect(await screen.findByTestId('saveModal')).toBeInTheDocument();
    expect(mockSaveModal).toHaveBeenCalledWith(
      expect.objectContaining({
        initialInput: { attributes, time_range: timeRange },
        isSaveable: false,
        telemetrySource: 'chat',
      })
    );
    expect(onBuiltInAction).toHaveBeenCalledWith('saveToDashboard');

    (mockSaveModal.mock.calls[0][0] as { onClose: () => void }).onClose();
    expect(screen.queryByTestId('saveModal')).not.toBeInTheDocument();
  });
});
