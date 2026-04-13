import type { IngestStreamLifecycle, IlmPolicy } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
export type LifecycleEditAction = 'ilm' | 'custom' | 'indefinite';
interface Props {
    closeModal: () => void;
    updateLifecycle: (lifecycle: IngestStreamLifecycle) => void;
    getIlmPolicies: () => Promise<IlmPolicy[]>;
    definition: Streams.ingest.all.GetResponse;
    updateInProgress: boolean;
}
export declare function EditLifecycleModal({ closeModal, updateLifecycle, getIlmPolicies, definition, updateInProgress, }: Props): React.JSX.Element;
export {};
