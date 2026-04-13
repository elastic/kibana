import { Streams } from '@kbn/streams-schema';
import React from 'react';
export declare const RetentionCard: ({ definition, openEditModal, isEditLifecycleFlyoutOpen, }: {
    definition: Streams.ingest.all.GetResponse;
    openEditModal: () => void;
    isEditLifecycleFlyoutOpen?: boolean;
}) => React.JSX.Element;
