import React from 'react';
import type { DownloadSource } from '../../../../types';
export interface DownloadSourceTableProps {
    downloadSources: DownloadSource[];
    deleteDownloadSource: (ds: DownloadSource) => void;
    hasAllSettingsPrivileges: boolean;
}
export declare const DownloadSourceTable: React.FunctionComponent<DownloadSourceTableProps>;
