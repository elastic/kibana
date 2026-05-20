export declare const PLUGIN: {
    minimumLicenseType: "basic";
    getI18nName: () => string;
};
export declare const MAJOR_VERSION = "8.5.0";
export declare const API_BASE_PATH = "/api/remote_clusters";
export declare const SNIFF_MODE = "sniff";
export declare const PROXY_MODE = "proxy";
export declare const getSecurityModel: (type: string) => string;
export declare const MAX_NODE_CONNECTIONS: number;
export declare enum SECURITY_MODEL {
    API = "api_key",
    CERTIFICATE = "certificate"
}
