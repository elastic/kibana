import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function ClassicStreamDetailManagement({ definition, refreshDefinition, }: {
    definition: Streams.ClassicStream.GetResponse;
    refreshDefinition: () => void;
}): React.JSX.Element | null;
