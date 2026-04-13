import type { Streams } from '@kbn/streams-schema';
import React from 'react';
interface StreamDetailEnrichmentContentProps {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
}
export declare function StreamDetailEnrichmentContent(props: StreamDetailEnrichmentContentProps): React.JSX.Element;
export declare function StreamDetailEnrichmentContentImpl(): React.JSX.Element | null;
export {};
