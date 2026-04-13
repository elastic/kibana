import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function WiredAdvancedView({ definition, refreshDefinition, }: {
    definition: Streams.WiredStream.GetResponse;
    refreshDefinition: () => void;
}): React.JSX.Element;
