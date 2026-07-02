/**
 * Returns true if inferenceId is not provided, or when provided, it is a default ELSER inference ID
 * @param inferenceId
 * @returns
 */
export declare const isImpliedDefaultElserInferenceId: (inferenceId: string | null | undefined) => boolean;
export declare const isDefaultLinuxElserInferenceId: (inferenceId: string | null | undefined) => inferenceId is ".elser-2-elasticsearch" | ".elser-2-elastic" | null | undefined;
