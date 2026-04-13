import type { SchemaFieldStatus, MappedSchemaField } from '../types';
declare const defaultControls: {
    readonly query: import("@elastic/eui").Query;
    readonly status: SchemaFieldStatus[];
    readonly type: Array<MappedSchemaField["type"]>;
};
export type TControls = typeof defaultControls;
export declare const useControls: () => [{
    query: import("@elastic/eui").Query;
    status: SchemaFieldStatus[];
    type: Array<MappedSchemaField["type"]>;
}, import("react").Dispatch<Partial<{
    readonly query: import("@elastic/eui").Query;
    readonly status: SchemaFieldStatus[];
    readonly type: Array<MappedSchemaField["type"]>;
}>>];
export type TControlsChangeHandler = (update: Partial<TControls>) => void;
export {};
