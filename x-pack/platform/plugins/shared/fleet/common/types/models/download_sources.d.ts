import type { BaseSSLSecrets, SOSecret } from './secret';
export interface DownloadSourceSecrets extends BaseSSLSecrets {
    auth?: {
        password?: SOSecret;
        api_key?: SOSecret;
    };
}
export interface DownloadSourceBase {
    name: string;
    host: string;
    is_default: boolean;
    proxy_id?: string | null;
    ssl?: {
        certificate_authorities?: string[];
        certificate?: string;
        key?: string;
    };
    auth?: {
        headers?: Array<{
            key: string;
            value: string;
        }>;
        username?: string;
        password?: string;
        api_key?: string;
    };
    secrets?: DownloadSourceSecrets;
}
export type DownloadSource = DownloadSourceBase & {
    id: string;
};
