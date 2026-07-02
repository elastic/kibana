import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { OpenAiProviderType } from '@kbn/connector-schemas/openai';
export type AIConnector = ActionConnector & {
    apiProvider?: OpenAiProviderType;
    isRecommended?: boolean;
    /** When true, this connector represents an Elastic-managed inference endpoint (EIS). */
    isEis?: boolean;
};
