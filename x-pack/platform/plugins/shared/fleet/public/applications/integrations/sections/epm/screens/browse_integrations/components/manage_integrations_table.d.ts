import React from 'react';
import { useStartServices } from '../../../../../hooks';
export type DataStreamResultsFlyoutComponent = NonNullable<ReturnType<typeof useStartServices>['automaticImport']>['components']['DataStreamResultsFlyout'];
export type DataStreamResponse = React.ComponentProps<DataStreamResultsFlyoutComponent>['dataStream'];
export type TaskStatus = DataStreamResponse['status'];
export interface AutomaticImportTelemetry {
    reportEvent(event: string, data: Record<string, unknown>): void;
}
export interface CreatedIntegrationRow {
    integrationId: string;
    title: string;
    logo?: string;
    totalDataStreamCount: number;
    successfulDataStreamCount: number;
    version?: string;
    createdBy: string;
    createdByProfileUid?: string;
    status: TaskStatus;
}
export declare const ManageIntegrationsTable: React.FC<{
    integrations: CreatedIntegrationRow[];
    isLoading: boolean;
    isError: boolean;
    onRefetch: () => void;
    prereleaseIntegrationsEnabled: boolean;
}>;
