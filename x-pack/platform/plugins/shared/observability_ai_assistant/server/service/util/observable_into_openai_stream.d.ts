import type { Logger } from '@kbn/logging';
import type { Observable } from 'rxjs';
import { PassThrough } from 'stream';
import type { BufferFlushEvent, StreamingChatResponseEventWithoutError } from '../../../common/conversation_complete';
export declare function observableIntoOpenAIStream(source: Observable<StreamingChatResponseEventWithoutError | BufferFlushEvent>, logger: Logger): PassThrough;
