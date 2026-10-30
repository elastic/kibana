/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExecutionTelemetryMetadata } from './build_execution_telemetry_metadata';

describe('buildExecutionTelemetryMetadata', () => {
  it('returns the caller metadata unchanged when there is no trace id and no workflow run', () => {
    const telemetryMetadata = { pluginId: 'my_plugin' };

    expect(buildExecutionTelemetryMetadata({ telemetryMetadata })).toBe(telemetryMetadata);
  });

  it('returns undefined when there is nothing to report', () => {
    expect(buildExecutionTelemetryMetadata({})).toBeUndefined();
  });

  it('adds the trace id', () => {
    expect(
      buildExecutionTelemetryMetadata({
        telemetryMetadata: { pluginId: 'my_plugin' },
        traceId: 'trace-1',
      })
    ).toEqual({ pluginId: 'my_plugin', traceId: 'trace-1' });
  });

  it('sends the workflow run as the interaction id, with no caller metadata', () => {
    expect(buildExecutionTelemetryMetadata({ workflowExecutionId: 'workflow-run-1' })).toEqual({
      interactionId: 'workflow-run-1',
    });
  });

  it('sends the workflow run as the interaction id alongside the caller metadata and trace id', () => {
    expect(
      buildExecutionTelemetryMetadata({
        telemetryMetadata: { pluginId: 'alertzero_fp_tp_analysis', aggregateBy: 'alertzero' },
        traceId: 'trace-1',
        workflowExecutionId: 'workflow-run-1',
      })
    ).toEqual({
      aggregateBy: 'alertzero',
      interactionId: 'workflow-run-1',
      pluginId: 'alertzero_fp_tp_analysis',
      traceId: 'trace-1',
    });
  });

  it("does not send the workflow run as a sub-agent's interaction id, only the main agent's", () => {
    expect(
      buildExecutionTelemetryMetadata({
        parentExecutionId: 'parent-execution-1',
        telemetryMetadata: { pluginId: 'my_plugin' },
        traceId: 'trace-1',
        workflowExecutionId: 'workflow-run-1',
      })
    ).toEqual({ pluginId: 'my_plugin', traceId: 'trace-1' });
  });

  it('returns undefined for a sub-agent with only a workflow run to report', () => {
    expect(
      buildExecutionTelemetryMetadata({
        parentExecutionId: 'parent-execution-1',
        workflowExecutionId: 'workflow-run-1',
      })
    ).toBeUndefined();
  });

  it('keeps an interaction id the caller set', () => {
    expect(
      buildExecutionTelemetryMetadata({
        telemetryMetadata: { interactionId: 'caller-interaction' },
        workflowExecutionId: 'workflow-run-1',
      })
    ).toEqual({ interactionId: 'caller-interaction' });
  });

  it('does not mutate the caller metadata', () => {
    const telemetryMetadata = { pluginId: 'my_plugin' };

    buildExecutionTelemetryMetadata({
      telemetryMetadata,
      traceId: 'trace-1',
      workflowExecutionId: 'workflow-run-1',
    });

    expect(telemetryMetadata).toEqual({ pluginId: 'my_plugin' });
  });
});
