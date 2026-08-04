import type { UserMessagesGetter, UserMessage, SharingSavedObjectProps, LensPublicCallbacks, LensInternalApi } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from '../types';
export declare function buildUserMessagesHelpers(api: LensApi, internalApi: LensInternalApi, { coreStart, data, visualizationMap, datasourceMap, spaces }: LensEmbeddableStartServices, onBeforeBadgesRender: LensPublicCallbacks['onBeforeBadgesRender'], metaInfo?: SharingSavedObjectProps, getConsumerMessages?: () => UserMessage[]): {
    getUserMessages: UserMessagesGetter;
    addUserMessages: (messages: UserMessage[]) => void;
    updateWarnings: () => void;
    updateMessages: (messages: UserMessage[]) => void;
    resetMessages: () => void;
    updateBlockingErrors: (blockingMessages: UserMessage[] | Error) => void;
    updateValidationErrors: (messages: UserMessage[]) => void;
};
