import type { WindowParameters } from './window_parameters';
/**
 * Swaps the baseline and deviation window parameters. To be used when we identify the type of analysis to be 'dip'.
 *
 * @param windowParameters An object containing the window parameters for baseline and deviation periods.
 * @returns A new `WindowParameters` object with the baseline and deviation parameters swapped.
 */
export declare const getSwappedWindowParameters: (windowParameters: WindowParameters) => WindowParameters;
