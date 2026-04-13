import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function ImportExportPanel({ definition, refreshDefinition, }: {
    definition: Streams.all.GetResponse;
    refreshDefinition: () => void;
}): React.JSX.Element;
