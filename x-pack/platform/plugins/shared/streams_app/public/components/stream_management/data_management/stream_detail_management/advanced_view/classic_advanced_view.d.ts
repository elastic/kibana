import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function ClassicAdvancedView({ definition, refreshDefinition, }: {
    definition: Streams.ClassicStream.GetResponse;
    refreshDefinition: () => void;
}): React.JSX.Element;
