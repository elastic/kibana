import type { Message } from '@kbn/inference-common';
import { type AnonymizationRecord } from './types';
/**
 * Apply a flattened AnonymizationRecord (JSON Pointer -> string) onto a clone of `original`.
 */
export declare function messageFromAnonymizationRecords(original: Message, anonymizedRecord: AnonymizationRecord): Message;
