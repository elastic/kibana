export declare const PLUGIN_ID: "evals";
export declare const PLUGIN_NAME: "Evaluations";
export declare const APP_PATH: "/app/management/ai/evals";
export declare const EVALS_API_PRIVILEGES: {
    readonly read: "read_evals";
    readonly manage: "manage_evals";
};
export declare const EVALS_UI_PRIVILEGES: {
    readonly show: "show";
    readonly manage: "manage";
};
export { MAX_ID_LENGTH, MAX_NAME_LENGTH, EXPERIMENT_LIMITS, EVALS_EXPERIMENT_WORKFLOW_TAG, isEvalsOwnedWorkflow, } from './experiments/run_experiment';
