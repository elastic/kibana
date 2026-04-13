import React from 'react';
import type { Streams } from '@kbn/streams-schema';
interface StreamConfigurationPanelProps {
    definition: Streams.QueryStream.GetResponse;
    refreshDefinition: () => void;
}
export declare function StreamConfigurationPanel({ definition, refreshDefinition, }: StreamConfigurationPanelProps): React.JSX.Element;
export {};
