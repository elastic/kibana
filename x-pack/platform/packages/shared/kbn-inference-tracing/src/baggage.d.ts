export declare const BAGGAGE_TRACKING_BEACON_KEY = "kibana.inference.tracing";
export declare const BAGGAGE_TRACKING_BEACON_VALUE = "1";
/**
 * W3C baggage key used by eval runs to tag all inference spans with the execution ID.
 *
 * This is intended to be set by clients (e.g. Scout/evals test runner) via the `baggage` HTTP header,
 * and then propagated through tracing context. The value is derived from TEST_RUN_ID,
 * identifying a single invocation of the evaluation framework (not a per-task experiment ID).
 */
export declare const EXECUTION_ID_BAGGAGE_KEY = "kibana.evals.execution_id";
/**
 * W3C baggage key used by eval runs to tag all inference spans with the experiment ID.
 *
 * Unlike execution_id (which is per-worker/suite-run), this changes per experiment
 * within a suite run, enabling per-experiment trace filtering.
 */
export declare const EVAL_EXPERIMENT_ID_BAGGAGE_KEY = "kibana.evals.experiment_id";
/**
 * W3C baggage key used to tag spans emitted while an evaluator is running (e.g. its own
 * LLM-judge call) with the evaluator's name.
 *
 * This lets trace-sampling queries (e.g. the online-eval workflow) exclude an evaluator's
 * own byproduct traces from being picked up as evaluation subjects, by filtering on the
 * exported `attributes.evaluator.name` span attribute.
 */
export declare const EVALUATOR_NAME_BAGGAGE_KEY = "kibana.evals.evaluator_name";
export declare const CONVERSATION_ID_BAGGAGE_KEY = "gen_ai.conversation.id";
