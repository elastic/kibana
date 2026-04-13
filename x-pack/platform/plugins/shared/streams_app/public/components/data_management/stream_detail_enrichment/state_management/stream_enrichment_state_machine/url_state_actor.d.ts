import type { ActionArgs } from 'xstate';
import type { StreamEnrichmentContextType, StreamEnrichmentEvent, StreamEnrichmentServiceDependencies } from './types';
export declare function createUrlInitializerActor({ core, urlStateStorageContainer, }: Pick<StreamEnrichmentServiceDependencies, 'core' | 'urlStateStorageContainer'>): import("xstate").CallbackActorLogic<import("xstate").EventObject, import("xstate").NonReducibleUnknown, import("xstate").EventObject>;
export declare function createUrlSyncAction({ urlStateStorageContainer, }: Pick<StreamEnrichmentServiceDependencies, 'urlStateStorageContainer'>): ({ context, }: ActionArgs<StreamEnrichmentContextType, StreamEnrichmentEvent, StreamEnrichmentEvent>) => void;
