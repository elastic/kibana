import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function IndexConfiguration({ definition, refreshDefinition, children, }: {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
    children?: React.ReactNode;
}): React.JSX.Element;
