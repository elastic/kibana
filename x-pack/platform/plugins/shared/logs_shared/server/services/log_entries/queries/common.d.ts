export declare const createSortClause: (sortDirection: "asc" | "desc", timestampField: string, tiebreakerField: string) => {
    sort: {
        [x: string]: "asc" | "desc" | {
            order: "asc" | "desc";
            format: string;
            numeric_type: string;
        };
    };
};
export declare const createTimeRangeFilterClauses: (startTimestamp: number, endTimestamp: number, timestampField: string) => {
    range: {
        [x: string]: {
            gte: number;
            lte: number;
            format: string;
        };
    };
}[];
