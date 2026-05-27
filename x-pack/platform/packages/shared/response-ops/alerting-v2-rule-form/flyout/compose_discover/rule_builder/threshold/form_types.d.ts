export declare enum Aggregation {
    COUNT = "count",
    AVG = "avg",
    SUM = "sum",
    MIN = "min",
    MAX = "max",
    CARDINALITY = "cardinality",
    P95 = "p95",
    P99 = "p99"
}
export declare enum Comparator {
    GT = ">",
    GTE = ">=",
    LT = "<",
    LTE = "<=",
    BETWEEN = "between",
    NOT_BETWEEN = "not_between"
}
export type ConditionOperator = 'AND' | 'OR';
export interface StatDefinition {
    id: string;
    label: string;
    aggregation: Aggregation;
    field?: string;
    filter?: string;
}
export interface EvaluationDefinition {
    id: string;
    label: string;
    expression: string;
}
export interface AlertCondition {
    id: string;
    metric: string;
    comparator: Comparator;
    threshold: number[];
}
export interface ThresholdFormValues {
    indexPattern: string;
    timeField: string;
    filterQuery?: string;
    stats: StatDefinition[];
    evaluations: EvaluationDefinition[];
    alertConditions: AlertCondition[];
    conditionOperator: ConditionOperator;
    groupByFields: string[];
}
export declare const AGGREGATIONS_REQUIRING_FIELD: Aggregation[];
export declare const deriveStatLabel: (agg: Aggregation, field?: string) => string;
export declare const DEFAULT_STAT: Omit<StatDefinition, 'id'>;
export declare const nextEvalLabel: (existingLabels: string[]) => string;
export declare const DEFAULT_ALERT_CONDITION: Omit<AlertCondition, 'id'>;
export declare const generateId: () => string;
export declare const DEFAULT_THRESHOLD_FORM_VALUES: ThresholdFormValues;
