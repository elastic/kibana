/**
 * Builds the Dev Tools console payload for creating a golden cluster API key.
 *
 * Privileges are sourced from @kbn/evals-common so the CLI, plugin UI,
 * and upload scripts all share a single source of truth.
 */
export declare const buildApiKeyPayload: (userIdentifier: string) => string;
