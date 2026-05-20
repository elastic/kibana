import React from 'react';
import type { ClientConfigType, ReportingAPIClient } from '@kbn/reporting-public';
interface Props {
    apiClient: ReportingAPIClient;
    clientConfig: ClientConfigType;
}
export declare const ReportDiagnostic: ({ apiClient, clientConfig }: Props) => React.JSX.Element;
export {};
