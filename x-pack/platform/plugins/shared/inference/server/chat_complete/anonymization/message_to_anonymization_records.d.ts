import type { Message } from '@kbn/inference-common';
import { type AnonymizationRecord } from './types';
/**
 * Flattens anonymizable parts of a message into a map of JSON Pointer -> string leaf.
 */
export declare function messageToAnonymizationRecords(message: Message): AnonymizationRecord;
