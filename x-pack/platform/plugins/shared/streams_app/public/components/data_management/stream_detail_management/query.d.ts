import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function QueryStreamDetailManagement({ definition, refreshDefinition, }: {
    definition: Streams.QueryStream.GetResponse;
    refreshDefinition: () => void;
}): React.JSX.Element | null;
