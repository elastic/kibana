import React from 'react';
import type { DownloadSource, FleetProxy } from '../../../../types';
export interface EditDownloadSourceFlyoutProps {
    downloadSource?: DownloadSource;
    onClose: () => void;
    proxies: FleetProxy[];
}
export declare const EditDownloadSourceFlyout: React.FunctionComponent<EditDownloadSourceFlyoutProps>;
