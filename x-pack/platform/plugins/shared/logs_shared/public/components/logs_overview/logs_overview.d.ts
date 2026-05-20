import type { LogsOverviewProps as FullLogsOverviewProps, LogsOverviewDependencies, LogsOverviewErrorContentProps } from '@kbn/logs-overview';
import React from 'react';
export type LogsOverviewProps = Omit<FullLogsOverviewProps, 'dependencies' | 'featureFlags'>;
export interface SelfContainedLogsOverviewHelpers {
    ErrorContent: React.ComponentType<LogsOverviewErrorContentProps>;
    LoadingContent: React.ComponentType;
}
export type SelfContainedLogsOverviewComponent = React.ComponentType<LogsOverviewProps>;
export type SelfContainedLogsOverview = SelfContainedLogsOverviewComponent & SelfContainedLogsOverviewHelpers;
export declare const createLogsOverview: (dependencies: LogsOverviewDependencies) => SelfContainedLogsOverview;
