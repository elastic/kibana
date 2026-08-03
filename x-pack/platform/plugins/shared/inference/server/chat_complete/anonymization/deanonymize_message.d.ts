import type { ChatCompletionEvent, AnonymizationOutput } from '@kbn/inference-common';
import type { OperatorFunction } from 'rxjs';
export declare function deanonymizeMessage<T extends ChatCompletionEvent>(anonymization: AnonymizationOutput): OperatorFunction<T, T>;
