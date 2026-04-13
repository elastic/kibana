import React from 'react';
import type { LifecyclePhase } from './lifecycle_types';
import type { TimelineSegment } from './data_lifecycle_segments';
export declare const DataLifecycleTimeline: ({ phases, isRetentionInfinite, timelineSegments, gridTemplateColumns, }: {
    phases: LifecyclePhase[];
    isRetentionInfinite: boolean;
    timelineSegments?: TimelineSegment[];
    gridTemplateColumns: string;
}) => React.JSX.Element;
