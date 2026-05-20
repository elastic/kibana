import React from 'react';
export type LogsSource = 'file' | 'index';
type ReportDataStreamFlyoutOpened = (params: {
    integrationId?: string;
}) => void;
type ReportEditDataStreamFlyoutOpened = (params?: {
    integrationId?: string;
    dataStreamId?: string;
}) => void;
type ReportAnalyzeLogsTriggered = (params: {
    integrationId?: string;
    dataStreamId?: string;
    logsSource: LogsSource;
    inputTypes: string[];
}) => void;
type ReportEditPipelineTabOpened = (params?: {
    integrationId?: string;
    dataStreamId?: string;
}) => void;
type ReportCodeEditorCopyClicked = (params?: {
    integrationId?: string;
    dataStreamId?: string;
}) => void;
type ReportCancelButtonClicked = (params?: {
    integrationId?: string;
}) => void;
type ReportDoneButtonClicked = (params?: {
    integrationId?: string;
}) => void;
type ReportDataStreamDeleteConfirmed = (params?: {
    integrationId?: string;
    dataStreamId?: string;
}) => void;
type ReportDataStreamRefreshConfirmed = (params?: {
    integrationId?: string;
    dataStreamId?: string;
}) => void;
type ReportPipelineEdited = (params: {
    integrationId?: string;
    dataStreamId?: string;
    linesAdded: number;
    linesRemoved: number;
    netLineChange: number;
}) => void;
interface TelemetryContextProps {
    sessionId: string;
    reportDataStreamFlyoutOpened: ReportDataStreamFlyoutOpened;
    reportEditDataStreamFlyoutOpened: ReportEditDataStreamFlyoutOpened;
    reportAnalyzeLogsTriggered: ReportAnalyzeLogsTriggered;
    reportEditPipelineTabOpened: ReportEditPipelineTabOpened;
    reportCodeEditorCopyClicked: ReportCodeEditorCopyClicked;
    reportCancelButtonClicked: ReportCancelButtonClicked;
    reportDoneButtonClicked: ReportDoneButtonClicked;
    reportDataStreamDeleteConfirmed: ReportDataStreamDeleteConfirmed;
    reportDataStreamRefreshConfirmed: ReportDataStreamRefreshConfirmed;
    reportPipelineEdited: ReportPipelineEdited;
}
export declare const useTelemetry: () => TelemetryContextProps;
export declare const TelemetryContextProvider: React.NamedExoticComponent<{
    children?: React.ReactNode | undefined;
}>;
export {};
