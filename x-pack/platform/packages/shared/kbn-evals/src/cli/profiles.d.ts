import type { FlagsReader } from '@kbn/dev-cli-runner';
export declare const VAULT_CONFIG_DIR = "x-pack/platform/packages/shared/kbn-evals/scripts/vault";
export declare const stripTrailingSlash: (url: string) => string;
export declare const probeHttp: (url: string) => Promise<boolean>;
export declare const isExportProfileImplicitLocal: (flagsReader: FlagsReader, exportProfile?: string) => boolean;
interface VaultConfig {
    evaluationsKbn?: {
        url?: string;
        apiKey?: string;
    };
    evaluationsEs?: {
        url?: string;
        apiKey?: string;
    };
    tracingEs?: {
        url?: string;
        apiKey?: string;
    };
    tracingExporters?: unknown;
    gcsDatasetAccessCredentials?: unknown;
}
export declare const resolveVaultConfigPath: (repoRoot: string, profile?: string) => string;
export declare const defaultExportProfile: (repoRoot: string) => string | undefined;
export declare const readVaultConfig: (repoRoot: string, profile?: string) => VaultConfig | undefined;
export declare const envFromDatasetsProfile: (repoRoot: string, profile?: string) => Record<string, string>;
export declare const envFromExportProfile: (repoRoot: string, profile?: string, options?: {
    defaultTracingExporters?: boolean;
}) => Record<string, string>;
export {};
