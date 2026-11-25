/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { PendingConnection } from './canvas_connection_highlight';
import { CanvasConnectionTip } from './canvas_connection_tip';

const SOME_TARGETS_TIP =
  "Connect to another node that is not faded. Faded nodes share no signal with this one, already receive its data, or can't take this kind of connection.";
const NO_TARGETS_TIP =
  "No node can take this connection. Faded nodes share no signal with this one, already receive its data, or can't take this kind of connection.";
const TARGETS_HIDDEN_BY_SEARCH_TIP =
  'No node in your search results can take this connection. Clear the search to see the nodes that can.';

const withTargets: PendingConnection = { originId: 's1', targetIds: new Set(['d1']) };
const withoutTargets: PendingConnection = { originId: 's1', targetIds: new Set() };

const tip = () => screen.queryByTestId('streamsCanvasConnectionTip');

describe('CanvasConnectionTip', () => {
  it('is hidden while no line is dragged', () => {
    render(<CanvasConnectionTip connection={null} />);

    expect(tip()).toBeNull();
  });

  it('points to the nodes that are not faded while some can take the line', () => {
    render(<CanvasConnectionTip connection={withTargets} />);

    expect(tip()).toHaveTextContent(SOME_TARGETS_TIP);
  });

  it('says no node can take the line when none can', () => {
    render(<CanvasConnectionTip connection={withoutTargets} />);

    expect(tip()).toHaveTextContent(NO_TARGETS_TIP);
  });

  it('announces the tip politely and keeps the panel out of the accessibility tree', async () => {
    render(<CanvasConnectionTip connection={withTargets} />);

    const announcer = screen.getByRole('status');
    await waitFor(() => expect(announcer).toHaveTextContent(SOME_TARGETS_TIP));
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(tip()).toHaveAttribute('aria-hidden', 'true');
  });

  describe('while the Map is searched', () => {
    // Searching `s1` shows it and the `d2` it already feeds. `d1`, the only target, is hidden.
    const searchShowingNoTarget = new Set(['s1', 'd2']);

    it('asks to clear the search when it hides every node that can take the line', () => {
      render(<CanvasConnectionTip connection={withTargets} shownNodeIds={searchShowingNoTarget} />);

      expect(tip()).toHaveTextContent(TARGETS_HIDDEN_BY_SEARCH_TIP);
    });

    it('points to the nodes that are not faded when the search shows one that can take the line', () => {
      render(<CanvasConnectionTip connection={withTargets} shownNodeIds={new Set(['s1', 'd1'])} />);

      expect(tip()).toHaveTextContent(SOME_TARGETS_TIP);
    });

    it('says no node can take the line when none can, whatever the search shows', () => {
      render(
        <CanvasConnectionTip connection={withoutTargets} shownNodeIds={searchShowingNoTarget} />
      );

      expect(tip()).toHaveTextContent(NO_TARGETS_TIP);
    });
  });
});
