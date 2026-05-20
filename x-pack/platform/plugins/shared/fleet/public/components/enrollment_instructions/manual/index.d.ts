import type { DownloadSource, ProxyConfig, FleetServerHost } from '../../../types';
export declare const getDownloadBaseUrl: (downloadSource?: DownloadSource) => string;
export declare const getDownloadSourceProxyArgs: (downloadSourceProxy?: ProxyConfig) => {
    windows: string;
    curl: string;
};
export declare const ManualInstructions: ({ apiKey, fleetServerHost, fleetServerHostConfig, fleetProxy, downloadSource, downloadSourceProxy, agentVersion: agentVersion, gcpProjectId, gcpOrganizationId, gcpAccountType, showInstallServers, }: {
    apiKey: string;
    fleetServerHost: string;
    fleetServerHostConfig?: FleetServerHost;
    fleetProxy?: ProxyConfig;
    downloadSource?: DownloadSource;
    downloadSourceProxy?: ProxyConfig;
    agentVersion: string;
    gcpProjectId?: string;
    gcpOrganizationId?: string;
    gcpAccountType?: string;
    showInstallServers?: boolean;
}) => {
    linux_aarch64: string;
    linux_x86_64: string;
    mac_aarch64: string;
    mac_x86_64: string;
    windows: string;
    windows_msi: string;
    deb_aarch64: string;
    deb_x86_64: string;
    rpm_aarch64: string;
    rpm_x86_64: string;
    kubernetes: string;
    cloudFormation: string;
    googleCloudShell: string;
};
