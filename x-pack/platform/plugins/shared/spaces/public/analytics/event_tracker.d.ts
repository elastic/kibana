import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { SolutionView } from '../../common';
export declare enum EventType {
    SPACE_SOLUTION_CHANGED = "space_solution_changed",
    SPACE_CHANGED = "space_changed"
}
export declare enum FieldType {
    ACTION = "action",
    SPACE_ID = "space_id",
    SPACE_ID_PREV = "space_id_prev",
    SOLUTION = "solution",
    SOLUTION_PREV = "solution_prev"
}
export declare class EventTracker {
    private analytics;
    constructor(analytics: Pick<AnalyticsServiceStart, 'reportEvent'>);
    private track;
    /**
     * Track whenever the space "solution" is changed.
     */
    spaceSolutionChanged({ spaceId, action, solution, solutionPrev, }: {
        spaceId: string;
        action: 'create' | 'edit';
        solution: SolutionView;
        solutionPrev?: SolutionView;
    }): void;
    /**
     * Track whenever the user changes space.
     */
    changeSpace({ prevSpaceId, prevSolution, nextSpaceId, nextSolution, }: {
        prevSpaceId: string;
        prevSolution?: SolutionView;
        nextSpaceId: string;
        nextSolution?: SolutionView;
    }): void;
}
