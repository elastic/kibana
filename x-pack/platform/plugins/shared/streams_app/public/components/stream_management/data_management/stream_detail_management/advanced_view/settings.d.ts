import React from 'react';
import { Streams } from '@kbn/streams-schema';
export declare function Settings({ definition, refreshDefinition, children, }: {
    definition: Streams.ingest.all.GetResponse;
    refreshDefinition: () => void;
    children?: React.ReactNode;
}): React.JSX.Element;
