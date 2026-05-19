import type { Logger } from '@kbn/core/server';
/**
 * Download a url and calculate it's checksum
 */
export declare function fetch(url: string, path: string, logger?: Logger): Promise<string>;
