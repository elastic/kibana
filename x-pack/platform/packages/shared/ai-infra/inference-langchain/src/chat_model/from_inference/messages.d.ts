import type { ChatCompleteResponse } from '@kbn/inference-common';
import { AIMessage } from '@langchain/core/messages';
export declare const responseToLangchainMessage: (response: ChatCompleteResponse) => AIMessage;
