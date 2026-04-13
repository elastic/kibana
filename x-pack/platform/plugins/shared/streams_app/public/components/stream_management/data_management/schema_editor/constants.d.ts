export declare const EMPTY_CONTENT = "-----";
export declare const FIELD_TYPE_MAP: {
    readonly boolean: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly date: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly keyword: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly match_only_text: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly long: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly double: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly ip: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly geo_point: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly integer: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly short: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly byte: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly float: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly half_float: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly text: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly wildcard: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly version: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly unsigned_long: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly date_nanos: {
        readonly label: string;
        readonly readonly: false;
    };
    readonly system: {
        readonly label: string;
        readonly readonly: true;
    };
};
export type FieldTypeOption = keyof typeof FIELD_TYPE_MAP;
export declare const FIELD_STATUS_MAP: {
    inherited: {
        color: string;
        label: string;
        tooltip: string;
    };
    mapped: {
        color: string;
        label: string;
        tooltip: string;
    };
    unmapped: {
        color: string;
        label: string;
        tooltip: string;
    };
    dynamic: {
        color: string;
        label: string;
        tooltip: string;
    };
    pending: {
        color: string;
        label: string;
        tooltip: string;
    };
};
export type FieldStatus = keyof typeof FIELD_STATUS_MAP;
export declare const TABLE_COLUMNS: {
    readonly name: {
        readonly display: string;
    };
    readonly type: {
        readonly display: string;
    };
    readonly format: {
        readonly display: string;
    };
    readonly parent: {
        readonly display: string;
    };
    readonly status: {
        readonly display: string;
    };
    readonly source: {
        readonly display: string;
    };
    readonly result: {
        readonly display: string;
    };
};
export type TableColumnName = keyof typeof TABLE_COLUMNS;
export declare const DEFAULT_TABLE_COLUMN_NAMES: TableColumnName[];
export declare const SUPPORTED_TABLE_COLUMN_NAMES: TableColumnName[];
