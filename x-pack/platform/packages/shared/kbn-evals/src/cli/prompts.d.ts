import type { ToolingLog } from '@kbn/tooling-log';
import { type EvalSuiteDefinition } from './suites';
export interface AvailableConnectorEntry {
    id: string;
    name: string;
    source: 'env' | 'kibana.dev.yml';
}
export declare const parseConnectorsFromEnv: () => AvailableConnectorEntry[];
export declare const parseConnectorsFromKibanaDevYml: (repoRoot: string) => AvailableConnectorEntry[];
/**
 * Returns all available connectors, merging from KIBANA_TESTING_AI_CONNECTORS
 * and kibana.dev.yml. Env connectors take precedence (listed first); duplicates
 * from kibana.dev.yml are excluded.
 */
export declare const getAllAvailableConnectors: (repoRoot: string) => AvailableConnectorEntry[];
export declare const promptForSuite: (repoRoot: string, log: ToolingLog) => Promise<EvalSuiteDefinition>;
export declare const promptForConnector: (repoRoot: string, log: ToolingLog, message?: string) => Promise<string>;
export declare const promptForProject: (repoRoot: string, log: ToolingLog, message?: string) => Promise<string[]>;
export declare const isTTY: () => boolean;
/**
 * Reads the first `elasticsearch.hosts` entry from config/kibana.dev.yml,
 * including auth credentials when available.
 * Handles both dot-notation (`elasticsearch.hosts: ...`) and nested YAML
 * (`elasticsearch:\n  hosts: ...`).
 * If no credentials are found, defaults to `elastic:changeme` (yarn es snapshot default).
 */
export declare const readLocalEsUrl: (repoRoot: string) => string | undefined;
export declare const SCOUT_EVALS_ARGS: readonly ["start-server", "--arch", "stateful", "--domain", "classic", "--serverConfigSet", "evals_tracing"];
export declare const scoutEvalsArgs: (serverConfigSet?: string) => string[];
