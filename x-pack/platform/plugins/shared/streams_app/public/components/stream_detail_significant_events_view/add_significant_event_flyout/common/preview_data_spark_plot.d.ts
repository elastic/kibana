import type { StreamQuery, Streams } from '@kbn/streams-schema';
import React from 'react';
import type { AbsoluteTimeRange } from '@kbn/es-query';
export declare function PreviewDataSparkPlot({ query, definition, isQueryValid, showTitle, compressed, hideAxis, height, noOfBuckets, timeRange, }: {
    definition: Streams.all.Definition;
    query: StreamQuery;
    isQueryValid: boolean;
    showTitle?: boolean;
    compressed?: boolean;
    hideAxis?: boolean;
    height?: number;
    noOfBuckets?: number;
    timeRange?: AbsoluteTimeRange;
}): React.JSX.Element;
