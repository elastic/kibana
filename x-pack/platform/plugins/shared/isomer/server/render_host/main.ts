/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The render process: draws PNGs for its parent, charts included, in its own main thread. It owns every drawing
// engine (jsdom, Elastic Charts, Skia, takumi), so their memory goes when it exits.

import { dashboardChartSize } from '@kbn/isomer-primitives-dashboard';

import { createChartsDrawing, type ChartsDrawing, type DrawOptions } from '../charts_drawing';
import type { HostDrawOptions, HostMessage, HostReply } from './protocol';

const send = (reply: HostReply) => process.send?.(reply);
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const toDrawOptions = ({
  dashboardWidth,
  chartHints,
  scale,
  ...options
}: HostDrawOptions): DrawOptions & { scale?: number } => ({
  ...options,
  ...(scale === undefined ? {} : { scale }),
  ...(dashboardWidth === undefined
    ? {}
    : { sizeFor: dashboardChartSize(dashboardWidth) as DrawOptions['sizeFor'] }),
  ...(chartHints === undefined
    ? {}
    : { hintFor: ({ id }) => (id === undefined ? undefined : chartHints[id]) }),
});

let drawing: Promise<ChartsDrawing> | undefined;

process.on('message', (message: HostMessage) => {
  if (message.type === 'init') {
    drawing = createChartsDrawing({ geometry: message.geometry, inline: true, pdf: false });
    drawing.then(
      () => send({ type: 'ready' }),
      (error: unknown) => send({ type: 'failed', error: messageOf(error) })
    );
    return;
  }
  const { id, composition, options } = message;
  void (drawing ?? Promise.reject(new Error('the render process was not started')))
    .then((ready) => ready.drawPng(composition, toDrawOptions(options)))
    .then(
      (png): HostReply => ({ type: 'drawn', id, png }),
      (error: unknown): HostReply => ({ type: 'error', id, error: messageOf(error) })
    )
    .then(send);
});

// Without a parent there is no one to draw for.
process.on('disconnect', () => process.exit(0));
