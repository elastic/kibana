import type { OperatorFunction } from 'rxjs';
import type { ChatCompletionEvent as InferenceChatCompletionEvent } from '@kbn/inference-common';
import type { ChatCompletionChunkEvent, ChatCompletionMessageEvent } from '../../../../common';
export declare function convertInferenceEventsToStreamingEvents(): OperatorFunction<InferenceChatCompletionEvent, ChatCompletionChunkEvent | ChatCompletionMessageEvent>;
