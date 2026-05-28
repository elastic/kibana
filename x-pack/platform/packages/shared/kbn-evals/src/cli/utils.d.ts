export declare const VAULT_SECRET_PATH = "secret/kibana-issues/dev/inference/kibana-eis-ccm";
export declare const DEFAULT_VAULT_ADDR = "https://secrets.elastic.co:8200";
export declare const getVaultAddr: () => string;
export declare const safeExec: (command: string, args: string[]) => string | null;
