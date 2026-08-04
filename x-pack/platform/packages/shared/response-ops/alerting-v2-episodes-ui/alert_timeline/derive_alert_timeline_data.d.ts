import type { AlertTimelineData, AlertTimelineGroupingValues, AlertTimelinePhaseRow, AlertTimelineSortPolicy, AlertTimelineSummary } from './types';
/**
 * Builds timeline lanes from per-status episode phase rows (`buildEpisodePhasesQuery`):
 * order each episode's phases by start and link each to the next (Gantt bar = phases
 * end to end). An open episode's last phase tails to `windowEndMs`; a terminal INACTIVE phase
 * just marks recovery (no bar). Summary/total are supplied externally. Segments are
 * clipped to `[windowStartMs, windowEndMs]` for drawing; each segment keeps its `trueStartMs`
 * (the window-independent start overlaid by `applyEpisodeStarts`) so the tooltip
 * reports the real start even when the rendered left edge is clamped to `windowStartMs`.
 */
export declare const deriveAlertTimelineData: (phaseRows: AlertTimelinePhaseRow[], groupingValuesByHash: AlertTimelineGroupingValues, sort: AlertTimelineSortPolicy, windowStartMs: number, windowEndMs: number, summary: AlertTimelineSummary) => AlertTimelineData;
