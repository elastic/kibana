import { type Streams } from '@kbn/streams-schema';
import React from 'react';
import type { useDataStreamStats } from '../hooks/use_data_stream_stats';
export declare const StreamDetailGeneralData: ({ definition, refreshDefinition, data, }: {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
    data: ReturnType<typeof useDataStreamStats>;
}) => React.JSX.Element;
