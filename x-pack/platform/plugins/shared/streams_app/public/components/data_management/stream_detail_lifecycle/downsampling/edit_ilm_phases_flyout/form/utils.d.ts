export { formatMillisecondsInUnit, parseInterval, toMilliseconds } from '../../shared';
export declare function getRelativeBoundsInMs<P extends string>(orderedPhases: ReadonlyArray<P>, currentPhase: P, getValueMsForPhase: (phase: P) => number | null, { defaultLowerBoundMs }?: {
    defaultLowerBoundMs?: number;
}): {
    lowerBoundMs: number;
    upperBoundMs: number | undefined;
};
