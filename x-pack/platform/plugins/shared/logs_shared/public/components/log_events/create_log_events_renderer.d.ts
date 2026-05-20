import React from 'react';
import type { LogEventsDependencies, LogEventsProps } from './types';
export declare const createLogEventsRenderer: ({ dataViews, embeddable, searchSource }: LogEventsDependencies) => ({ query, nonHighlightingQuery, timeRange, index, displayOptions, executionContext, }: LogEventsProps) => React.JSX.Element;
