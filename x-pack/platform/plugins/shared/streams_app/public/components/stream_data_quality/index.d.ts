import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function StreamDetailDataQuality({ definition, refreshDefinition, }: {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition?: () => void;
}): string | React.JSX.Element;
