import type { Streams } from '@kbn/streams-schema';
import React from 'react';
interface Props {
    definition: Streams.all.GetResponse;
}
export declare function StreamDetailSignificantEventsView({ definition }: Props): React.JSX.Element;
export {};
