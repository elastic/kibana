export type IssueTypes = Array<{
    id: string;
    name: string;
}>;
export interface Fields {
    [key: string]: {
        allowedValues: Array<{
            name: string;
            id: string;
        }> | [];
        defaultValue: {
            name: string;
            id: string;
        } | {};
    };
}
export interface Issue {
    id: string;
    key: string;
    title: string;
}
export type Issues = Issue[];
