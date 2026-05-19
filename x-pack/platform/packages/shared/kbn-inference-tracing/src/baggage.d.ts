export declare const BAGGAGE_TRACKING_BEACON_KEY = "kibana.inference.tracing";
export declare const BAGGAGE_TRACKING_BEACON_VALUE = "1";
/**
 * W3C baggage key used by offline eval runs to tag all inference spans with the current eval run id.
 *
 * This is intended to be set by clients (e.g. Scout/evals test runner) via the `baggage` HTTP header,
 * and then propagated through tracing context.
 */
export declare const EVAL_RUN_ID_BAGGAGE_KEY = "kibana.evals.run_id";
