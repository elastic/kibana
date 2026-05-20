import React from 'react';
import type { PackageInfo } from '../../../../../../../../common';
interface Props {
    agentIds: string[];
    packageInfo?: PackageInfo;
    agentDataConfirmed: boolean;
    setAgentDataConfirmed: (v: boolean) => void;
    troubleshootLink: string;
}
export declare const ConfirmIncomingDataWithPreview: React.FunctionComponent<Props>;
export {};
