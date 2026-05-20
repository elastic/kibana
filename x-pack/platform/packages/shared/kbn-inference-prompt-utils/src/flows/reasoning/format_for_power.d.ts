import { type Message, type ToolOptions } from '@kbn/inference-common';
import type { ReasoningPower } from './types';
/**
 * Formats a request for the LLM by:
 * - removing all system tool calls & responses, except the last if it is a system tool
 * - Replacing `reason` tool calls and responses with `next` if power == 'low'
 * - injecting the amount of stepsLeft in the last tool response
 */
export declare function formatMessages<TMessage extends Message>({}: {
    messages: TMessage[];
    power: ReasoningPower;
    stepsLeft: number;
}): TMessage[];
export declare function formatToolOptions<TToolOptions extends ToolOptions>(toolOptions: TToolOptions, power: ReasoningPower): TToolOptions;
