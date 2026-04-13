import React from 'react';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { Streams } from '@kbn/streams-schema';
export interface StreamDetailContextProviderProps {
    name: string;
    streamsRepositoryClient: StreamsRepositoryClient;
}
export interface StreamDetailContextValue {
    definition: Streams.all.GetResponse;
    loading: boolean;
    refresh: () => void;
}
export declare function StreamDetailContextProvider({ name, streamsRepositoryClient, children, }: React.PropsWithChildren<StreamDetailContextProviderProps>): React.JSX.Element | null;
export declare function useStreamDetail(): StreamDetailContextValue;
export declare function useStreamDetailAsIngestStream(): {
    definition: Streams.ingest.all.GetResponse;
    loading: boolean;
    refresh: () => void;
};
