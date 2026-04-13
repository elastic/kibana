import type { Streams } from '@kbn/streams-schema';
import React from 'react';
interface StreamDetailRoutingProps {
    definition: Streams.WiredStream.GetResponse;
    refreshDefinition: () => void;
}
export declare function StreamDetailRouting(props: StreamDetailRoutingProps): React.JSX.Element;
export declare function StreamDetailRoutingImpl(): React.JSX.Element;
export {};
