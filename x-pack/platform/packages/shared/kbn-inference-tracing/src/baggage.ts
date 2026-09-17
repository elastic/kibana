/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BAGGAGE_TRACKING_BEACON_KEY = 'kibana.inference.tracing';
export const BAGGAGE_TRACKING_BEACON_VALUE = '1';

/**
 * W3C baggage key used by eval runs to tag all inference spans with the execution ID.
 *
 * This is intended to be set by clients (e.g. Scout/evals test runner) via the `baggage` HTTP header,
 * and then propagated through tracing context. The value is derived from TEST_RUN_ID,
 * identifying a single invocation of the evaluation framework (not a per-task experiment ID).
 */
export const EXECUTION_ID_BAGGAGE_KEY = 'kibana.evals.execution_id';

/**
 * W3C baggage key used by eval runs to tag all inference spans with the experiment ID.
 *
 * Unlike execution_id (which is per-worker/suite-run), this changes per experiment
 * within a suite run, enabling per-experiment trace filtering.
 */
export const EVAL_EXPERIMENT_ID_BAGGAGE_KEY = 'kibana.evals.experiment_id';

/**
 * W3C baggage key used to tag spans emitted while an evaluator is running (e.g. its own
 * LLM-judge call) with the evaluator's name.
 *
 * This lets trace-sampling queries (e.g. the online-eval workflow) exclude an evaluator's
 * own byproduct traces from being picked up as evaluation subjects, by filtering on the
 * exported `attributes.evaluator.name` span attribute.
 */
export const EVALUATOR_NAME_BAGGAGE_KEY = 'kibana.evals.evaluator_name';

export const CONVERSATION_ID_BAGGAGE_KEY = 'gen_ai.conversation.id';

/**
 * W3C baggage key used to tag inference spans emitted by an `ai.agent` workflow step
 * with the workflow execution's run id (`StepContext.execution.id`, i.e. the
 * `.workflows-executions` document id).
 *
 * The workflow execution engine's own trace id (from the `elastic-apm-node` transaction)
 * and the OTel trace id under which inference spans are emitted live in disconnected id
 * spaces today (the APM agent's `opentelemetryBridgeEnabled` defaults to `false` and Kibana
 * does not override it), so a span-side `trace.id` can never equal the workflow-side
 * `traceIds` value. This baggage key provides an independent, always-available join key:
 * ES|QL can match `.workflows-executions._id` against this attribute directly, without
 * requiring the two tracer stacks to share a trace id space.
 */
export const WORKFLOW_RUN_ID_BAGGAGE_KEY = 'kibana.workflows.run_id';
