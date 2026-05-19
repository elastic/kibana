import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export type Counters = ReturnType<typeof getCounters>;
/**
 * A helper utility that can be passed around and call the usage counter service
 */
export declare function getCounters(method: string, path: string, usageCounter: UsageCounter | undefined): {
    /**
     * constructs a counterName from the API request method and path
     * appends an optional "path suffix" for additional context about filetype, etc
     */
    usageCounter(pathSuffix?: string): void;
    /**
     * appends `:{statusCode}` to the counterName if there is a statusCode
     */
    errorCounter(pathSuffix?: string, statusCode?: number): void;
};
