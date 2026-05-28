import type { EvaluatorStats } from '../score_repository';
interface StatsDisplay {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
}
export interface EvaluatorDisplayOptions {
    decimalPlaces?: number;
    unitSuffix?: string;
    statsToInclude?: Array<keyof StatsDisplay>;
}
export interface EvaluatorDisplayGroup {
    evaluatorNames: string[];
    combinedColumnName: string;
}
export interface EvaluationTableOptions {
    firstColumnHeader?: string;
    styleRowName?: (name: string) => string;
    evaluatorDisplayOptions?: Map<string, EvaluatorDisplayOptions>;
    evaluatorDisplayGroups?: EvaluatorDisplayGroup[];
}
export declare function createTable(stats: EvaluatorStats[], repetitions: number, options?: EvaluationTableOptions): string;
export {};
