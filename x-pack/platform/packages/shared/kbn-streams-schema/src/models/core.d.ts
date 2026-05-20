export type ModelRepresentation = 'Definition' | 'Source' | 'GetResponse' | 'UpsertRequest';
export type OmitUpsertProps<T extends {
    name?: string;
    updated_at?: string;
}> = Omit<T, 'name' | 'updated_at'> & {
    name?: never;
    updated_at?: never;
};
export type StrictOmit<T, K extends keyof T> = Omit<T, K> & {
    [P in K]?: never;
};
export interface IModel {
    Definition: object;
    Source: object;
    GetResponse: object;
    UpsertRequest: object;
}
