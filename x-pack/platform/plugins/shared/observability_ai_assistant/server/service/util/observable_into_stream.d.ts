import type { Observable } from 'rxjs';
import type { PassThrough } from 'stream';
import type { BufferFlushEvent, StreamingChatResponseEventWithoutError } from '../../../common/conversation_complete';
export declare function observableIntoStream(source: Observable<StreamingChatResponseEventWithoutError | BufferFlushEvent>): PassThrough;
