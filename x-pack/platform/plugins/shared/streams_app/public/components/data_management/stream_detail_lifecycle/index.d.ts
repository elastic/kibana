import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function StreamDetailLifecycle({ definition, refreshDefinition, }: {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
}): React.JSX.Element;
