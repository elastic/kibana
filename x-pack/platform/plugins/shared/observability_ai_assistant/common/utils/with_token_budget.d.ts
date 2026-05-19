export declare function withTokenBudget<T extends unknown>(items: T[], budget: number, options?: {
    contentAccessor?: (item: T) => string;
    maximizeBudget?: boolean;
}): T[];
