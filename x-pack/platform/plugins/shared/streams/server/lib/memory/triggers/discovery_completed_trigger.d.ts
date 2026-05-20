import type { MemoryUpdateTrigger } from './types';
export declare const DISCOVERY_COMPLETED_TRIGGER_ID = "discovery-completed";
/**
 * Trigger that fires after insights discovery completes.
 * Uses a reasoning agent with memory tools to synthesize
 * new insights into wiki pages organized by categories.
 *
 * Expected payload: { insights: Array<{ title: string; evidence: Array<{ stream_name?: string }> }> }
 */
export declare const discoveryCompletedTrigger: MemoryUpdateTrigger;
