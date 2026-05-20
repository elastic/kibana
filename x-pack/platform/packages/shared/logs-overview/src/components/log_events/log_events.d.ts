import type { CSSProperties } from 'react';
import React from 'react';
import type { LogEventsControlBarDependencies, LogEventsControlBarProps } from './log_events_control_bar';
import type { LogEventsResultContentDependencies, LogEventsResultContentProps } from './log_events_result_content';
export type LogEventsProps = LogEventsControlBarProps & LogEventsResultContentProps & {
    dependencies: LogEventsDependencies;
    height?: CSSProperties['height'];
};
export type LogEventsDependencies = LogEventsControlBarDependencies & LogEventsResultContentDependencies;
export declare const LogEvents: React.NamedExoticComponent<LogEventsProps>;
