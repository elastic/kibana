import React from 'react';
import type { Output, DownloadSource, FleetServerHost, FleetProxy } from '../../../../types';
export interface SettingsPageProps {
    outputs: Output[];
    proxies: FleetProxy[];
    fleetServerHosts: FleetServerHost[];
    deleteOutput: (output: Output) => void;
    deleteFleetServerHost: (fleetServerHost: FleetServerHost) => void;
    downloadSources: DownloadSource[];
    deleteDownloadSource: (ds: DownloadSource) => void;
    deleteFleetProxy: (proxy: FleetProxy) => void;
}
export declare const SettingsPage: React.FunctionComponent<SettingsPageProps>;
