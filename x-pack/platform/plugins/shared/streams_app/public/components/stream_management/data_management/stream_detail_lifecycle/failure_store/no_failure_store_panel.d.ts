import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare const NoFailureStorePanel: ({ openModal, definition, }: {
    openModal: (show: boolean) => void;
    definition: Streams.ingest.all.GetResponse;
}) => React.JSX.Element;
