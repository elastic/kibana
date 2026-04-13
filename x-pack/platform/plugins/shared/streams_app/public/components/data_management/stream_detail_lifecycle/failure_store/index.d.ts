import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { useDataStreamStats } from '../hooks/use_data_stream_stats';
export declare const StreamDetailFailureStore: ({ definition, data, refreshDefinition, }: {
    definition: Streams.ingest.all.GetResponse;
    data: ReturnType<typeof useDataStreamStats>;
    refreshDefinition: () => void;
}) => React.JSX.Element;
