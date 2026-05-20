import { type StreamlangStep } from '../../types/streamlang';
import type { StreamlangValidationError } from './types';
/**
 * Validates structural rules:
 * - For wired streams: no manual_ingest_pipeline processors (they are forbidden)
 * - For all streams: remove_by_prefix is not used within where blocks
 * - For all streams: field names don't contain illegal characters
 */
export declare function validateStepsRecursively(steps: StreamlangStep[], errors: StreamlangValidationError[], processorCounter: {
    count: number;
}, streamType: 'classic' | 'wired', isWithinWhereBlock?: boolean): void;
