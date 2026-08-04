export interface Choice {
    value: string;
    label: string;
    dependent_value: string;
    element: string;
}
export type Fields = Record<string, Choice[]>;
