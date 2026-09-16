/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, fromCallback } from 'xstate';
import { DEFAULT_CONTEXT } from './defaults';
import { createPureDatasetQualityDetailsControllerStateMachine } from './state_machine';

describe('DatasetQualityDetailsControllerStateMachine', () => {
  it('stores a quality chart selection while data stream details are loading', () => {
    const pendingActor = fromCallback(() => () => undefined);
    const machine = createPureDatasetQualityDetailsControllerStateMachine({
      ...DEFAULT_CONTEXT,
      dataStream: 'logs-synth.2-default',
    }).provide({
      actors: {
        checkDatasetIsAggregatable: pendingActor,
        loadDataStreamDetails: pendingActor,
        checkBreakdownFieldIsEcs: pendingActor,
        loadDataStreamSettings: pendingActor,
        checkAndLoadIntegration: pendingActor,
      },
    });
    const actor = createActor(machine);

    actor.start();
    expect(
      actor.getSnapshot().matches({
        initializing: { dataStreamDetails: 'fetching' },
      })
    ).toBe(true);

    actor.send({
      type: 'QUALITY_ISSUES_CHART_CHANGE',
      qualityIssuesChart: 'failed',
    });

    expect(actor.getSnapshot().context.qualityIssuesChart).toBe('failed');
    actor.stop();
  });
});
