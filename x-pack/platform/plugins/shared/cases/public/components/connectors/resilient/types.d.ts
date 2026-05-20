export interface ResilientFieldMetadata {
    input_type: string;
    name: string;
    read_only: boolean;
    required: 'always' | 'close' | null;
    text: string;
    internal: boolean;
    prefix: string | null;
    values: Array<ResilientValuesItem> | null;
}
interface ResilientValuesItem {
    value: number | string;
    label: string;
    enabled: boolean;
    hidden: boolean;
    default: boolean;
}
export {};
