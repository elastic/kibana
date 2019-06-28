/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, cleanup } from 'react-testing-library';
import {
  withUnconnectedElementsLoadedTelemetry,
  WorkpadLoadedMetric,
  WorkpadLoadedWithErrorsMetric,
} from '../workpad_telemetry';

const trackMetric = jest.fn();
const Component = withUnconnectedElementsLoadedTelemetry(() => <div />, trackMetric);

const mockWorkpad = {
  id: 'workpadid',
  pages: [
    {
      elements: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
    },
    {
      elements: [{ id: '5' }],
    },
  ],
};

const resolvedArgsMatchWorkpad = {
  '1': {},
  '2': {},
  '3': {},
  '4': {},
  '5': {},
};

const resolvedArgsNotMatchWorkpad = {
  'non-matching-id': {},
};

const pendingCounts = {
  pending: 5,
  error: 0,
  ready: 0,
};

const readyCounts = {
  pending: 0,
  error: 0,
  ready: 5,
};

const errorCounts = {
  pending: 0,
  error: 1,
  ready: 4,
};

describe('Elements Loaded Telemetry', () => {
  beforeEach(() => {
    trackMetric.mockReset();
  });

  afterEach(cleanup);

  it('tracks when all resolvedArgs are completed', () => {
    const { rerender } = render(
      <Component
        telemetryElementCounts={pendingCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).not.toBeCalled();

    rerender(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).toBeCalledWith(WorkpadLoadedMetric);
  });

  it('only tracks loaded once', () => {
    const { rerender } = render(
      <Component
        telemetryElementCounts={pendingCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).not.toBeCalled();

    rerender(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );
    rerender(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).toBeCalledTimes(1);
  });

  it('does not track if resolvedArgs are never pending', () => {
    const { rerender } = render(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    rerender(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).not.toBeCalled();
  });

  it('tracks if elements are in error state after load', () => {
    const { rerender } = render(
      <Component
        telemetryElementCounts={pendingCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).not.toBeCalled();

    rerender(
      <Component
        telemetryElementCounts={errorCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).toBeCalledWith([WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric]);
  });

  it('tracks when the workpad changes and is loaded', () => {
    const otherWorkpad = {
      id: 'otherworkpad',
      pages: [
        {
          elements: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
        },
        {
          elements: [{ id: '5' }],
        },
      ],
    };

    const { rerender } = render(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsNotMatchWorkpad}
        workpad={otherWorkpad}
      />
    );

    expect(trackMetric).not.toBeCalled();

    rerender(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsNotMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).not.toBeCalled();

    rerender(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgsMatchWorkpad}
        workpad={mockWorkpad}
      />
    );

    expect(trackMetric).toBeCalledWith(WorkpadLoadedMetric);
  });

  it('does not track if workpad has no elements', () => {
    const otherWorkpad = {
      id: 'otherworkpad',
      pages: [],
    };

    const resolvedArgs = {};

    const { rerender } = render(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgs}
        workpad={otherWorkpad}
      />
    );

    rerender(
      <Component
        telemetryElementCounts={readyCounts}
        telemetryResolvedArgs={resolvedArgs}
        workpad={otherWorkpad}
      />
    );

    expect(trackMetric).not.toBeCalled();
  });
});
