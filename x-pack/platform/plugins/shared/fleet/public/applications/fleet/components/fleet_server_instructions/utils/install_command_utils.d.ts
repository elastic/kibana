import type { DownloadSource, ProxyConfig, FleetServerHost } from '../../../../../../common/types';
import type { PLATFORM_TYPE } from '../../../hooks';
export type CommandsByPlatform = {
    [key in PLATFORM_TYPE]: string;
};
export declare function getInstallCommandForPlatform({ platform, esOutputHost, serviceToken, esOutputProxy, policyId, fleetServerHost, isProductionDeployment, sslCATrustedFingerprint, kibanaVersion, downloadSource, downloadSourceProxy, }: {
    platform: PLATFORM_TYPE;
    esOutputHost: string;
    serviceToken: string;
    esOutputProxy?: ProxyConfig | undefined;
    policyId?: string;
    fleetServerHost?: FleetServerHost | null;
    isProductionDeployment?: boolean;
    sslCATrustedFingerprint?: string;
    kibanaVersion?: string;
    downloadSource?: DownloadSource;
    downloadSourceProxy?: ProxyConfig;
}): string;
