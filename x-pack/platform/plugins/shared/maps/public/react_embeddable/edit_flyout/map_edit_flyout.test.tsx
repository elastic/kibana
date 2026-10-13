/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen } from '@testing-library/react';
import type { TimeRange } from '@kbn/es-query';
import type { PanelEditFlyoutProps, PanelSettingsApi } from '@kbn/embeddable-plugin/public';
import { MapEditFlyout } from './map_edit_flyout';
import type { MapEmbeddableState } from '../../../common';

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: ({ getParentApi }: { getParentApi: () => unknown }) => {
    const parentApi = getParentApi() as { getSerializedStateForChild: () => unknown };
    return (
      <div data-test-subj="previewEmbeddable">
        {JSON.stringify(parentApi.getSerializedStateForChild())}
      </div>
    );
  },
  PanelEditFlyout: ({
    title,
    preview,
    editorLinkLabel,
    onNavigateToEditor,
  }: PanelEditFlyoutProps) => (
    <div>
      <h2>{title}</h2>
      {onNavigateToEditor ? <button onClick={onNavigateToEditor}>{editorLinkLabel}</button> : null}
      {preview}
    </div>
  ),
}));

jest.mock('../../kibana_services', () => ({
  getTimeFilter: () => ({ getTime: () => ({ from: 'now-15m', to: 'now' }) }),
}));

const createApi = (): PanelSettingsApi => ({
  title$: new BehaviorSubject<string | undefined>('My map'),
  hideTitle$: new BehaviorSubject<boolean | undefined>(undefined),
  description$: new BehaviorSubject<string | undefined>(undefined),
  hideBorder$: new BehaviorSubject<boolean | undefined>(undefined),
  timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  setTitle: jest.fn(),
  setHideTitle: jest.fn(),
  setDescription: jest.fn(),
  setHideBorder: jest.fn(),
  setTimeRange: jest.fn(),
});

const state = {
  savedObjectId: 'map-1',
  isMovementSynchronized: true,
  filterByMapExtent: true,
} as MapEmbeddableState;

const renderFlyout = (overrides: Partial<React.ComponentProps<typeof MapEditFlyout>> = {}) =>
  render(
    <MapEditFlyout
      api={createApi()}
      parentApi={{}}
      getState={() => state}
      navigateToEditor={jest.fn()}
      closeFlyout={jest.fn()}
      ariaLabelledBy="mapEditFlyoutTitleId"
      {...overrides}
    />
  );

describe('MapEditFlyout', () => {
  it('renders the flyout with a map title and a link to the Maps app', () => {
    renderFlyout();
    expect(screen.getByRole('heading', { name: 'Edit map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit in Maps' })).toBeInTheDocument();
  });

  it('hides the link when the map cannot be opened in the Maps app', () => {
    renderFlyout({ navigateToEditor: undefined });
    expect(screen.queryByRole('button', { name: 'Edit in Maps' })).not.toBeInTheDocument();
  });

  it('renders a non-interactive preview that does not affect other panels', () => {
    renderFlyout();
    const previewState = JSON.parse(screen.getByTestId('previewEmbeddable').textContent!);
    expect(previewState).toMatchObject({
      savedObjectId: 'map-1',
      isMovementSynchronized: false,
      filterByMapExtent: false,
      mapSettings: { disableInteractive: true, hideToolbarOverlay: true },
    });
  });
});
