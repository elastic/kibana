import React from 'react';
import type { Streams } from '@kbn/streams-schema';
interface StreamDetailEnrichmentProps {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
}
export declare function StreamDetailEnrichment({ definition, refreshDefinition, }: StreamDetailEnrichmentProps): React.JSX.Element;
export {};
