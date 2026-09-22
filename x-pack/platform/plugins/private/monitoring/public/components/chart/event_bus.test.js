/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { eventBus } from './event_bus';

describe('monitoring chart eventBus', function () {
  const events = ['thorPlotHover', 'thorPlotLeave', 'thorPlotSelecting', 'thorPlotBrush'];

  afterEach(() => {
    for (const event of events) {
      eventBus.off(event);
    }
  });

  it('fans out a trigger to every listener with a synthetic event and forwarded arguments', () => {
    const calls = [];
    const first = (event, pos, item, plot) => {
      calls.push(['first', event, pos, item, plot]);
    };
    const second = (event, pos, item, plot) => {
      calls.push(['second', event, pos, item, plot]);
    };

    eventBus.on('thorPlotHover', first);
    eventBus.on('thorPlotHover', second);

    const pos = { x: 10, y: 20 };
    const item = { seriesIndex: 1 };
    const plot = { id: 'plot-a' };
    eventBus.trigger('thorPlotHover', [pos, item, plot]);

    expect(calls).to.eql([
      ['first', { type: 'thorPlotHover' }, pos, item, plot],
      ['second', { type: 'thorPlotHover' }, pos, item, plot],
    ]);
  });

  it('calls a listener with only the synthetic event when no extra arguments are passed', () => {
    const calls = [];
    eventBus.on('thorPlotBrush', (...args) => {
      calls.push(args);
    });

    eventBus.trigger('thorPlotBrush');

    expect(calls).to.eql([[{ type: 'thorPlotBrush' }]]);
  });

  it('off(event, handler) removes that listener and leaves the others', () => {
    const calls = [];
    const kept = (event, extra) => {
      calls.push(['kept', event, extra]);
    };
    const removed = () => {
      calls.push('removed');
    };

    eventBus.on('thorPlotLeave', kept);
    eventBus.on('thorPlotLeave', removed);
    eventBus.off('thorPlotLeave', removed);
    eventBus.off('thorPlotLeave', () => {});

    eventBus.trigger('thorPlotLeave', ['extra']);

    expect(calls).to.eql([['kept', { type: 'thorPlotLeave' }, 'extra']]);
  });

  it('off(event) removes every listener for that event and leaves other events', () => {
    const calls = [];
    eventBus.on('thorPlotSelecting', () => {
      calls.push('selecting');
    });
    eventBus.on('thorPlotSelecting', () => {
      calls.push('selecting-again');
    });
    eventBus.on('thorPlotHover', (event, pos) => {
      calls.push(['hover', event, pos]);
    });

    eventBus.off('thorPlotSelecting');
    eventBus.trigger('thorPlotSelecting', [{ from: 1, to: 2 }]);
    eventBus.trigger('thorPlotHover', [{ x: 4 }]);

    expect(calls).to.eql([['hover', { type: 'thorPlotHover' }, { x: 4 }]]);
  });

  it('ignores trigger and off when an event has no listeners', () => {
    eventBus.trigger('thorPlotHover', [{ x: 1 }]);
    eventBus.off('thorPlotHover', () => {});
    eventBus.off('thorPlotLeave');
  });
});
