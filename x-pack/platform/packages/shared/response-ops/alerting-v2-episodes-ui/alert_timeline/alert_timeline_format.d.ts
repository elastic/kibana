import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export declare const formatTimestamp: (ms: number, timeZone?: string) => string;
/**
 * Human-readable duration from milliseconds (`2h 15m`).
 * Returns `fallback` (default `'0m'`) for non-positive / non-finite input.
 */
export declare const formatDuration: (ms: number, fallback?: string) => string;
export interface SegmentSpanFlags {
    /**
     * The span runs to the window's right edge and the episode has not recovered
     * (status is not inactive), i.e. it is still open. The tooltip should say
     * "Ongoing" rather than show the window edge as a (false) end.
     */
    isOngoing: boolean;
}
/**
 * Classify a rendered segment's right edge so the tooltip can avoid presenting a
 * clipped window edge as a real end time. The open tail's `x1Ms` is set to
 * `windowEndMs`, so right-edge equality is a reliable "ongoing" signal. (The left edge
 * needs no such treatment: the segment's `trueStartMs` is the real start,
 * resolved by the untimed starts query independent of the display window.)
 */
export declare const describeSegmentSpan: ({ x1Ms, status, windowEndMs, }: {
    x1Ms: number;
    status: AlertEpisodeStatus;
    windowEndMs: number;
}) => SegmentSpanFlags;
