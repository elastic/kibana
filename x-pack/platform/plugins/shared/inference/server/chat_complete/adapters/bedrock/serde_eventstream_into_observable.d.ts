import { Observable } from 'rxjs';
import type { Readable } from 'stream';
import type { ConverseBedrockChunkMember } from './converse_type';
interface ModelStreamErrorException {
    name: 'ModelStreamErrorException';
    originalStatusCode?: number;
    originalMessage?: string;
}
export interface ModelStreamErrorExceptionMember {
    modelStreamErrorException: ModelStreamErrorException;
}
export interface BedrockStreamChunkMember {
    chunk: ConverseBedrockChunkMember;
}
export type BedrockStreamMember = BedrockStreamChunkMember | ModelStreamErrorExceptionMember;
export declare function serdeEventstreamIntoObservable(readable: Readable): Observable<BedrockStreamMember>;
export {};
