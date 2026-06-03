import type { ToolingLog } from '@kbn/tooling-log';
export interface EvalSuiteMetadata {
    id: string;
    name?: string;
    description?: string;
    configPath: string;
    tags?: string[];
    ciLabels?: string[];
    serverConfigSet?: string;
}
export interface EvalSuiteDefinition {
    id: string;
    name: string;
    configPath: string;
    absoluteConfigPath: string;
    suiteRoot: string | null;
    relativeSuiteRoot: string | null;
    tags: string[];
    ciLabels: string[];
    description?: string;
    source: 'metadata' | 'discovery';
    serverConfigSet?: string;
}
export declare const readSuiteMetadata: (repoRoot: string, log?: ToolingLog) => EvalSuiteMetadata[];
export declare const discoverEvalSuites: (repoRoot: string, log?: ToolingLog) => EvalSuiteDefinition[];
export declare const resolveEvalSuites: (repoRoot: string, log?: ToolingLog, options?: {
    refresh?: boolean;
}) => EvalSuiteDefinition[];
