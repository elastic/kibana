export declare const filebeatOsqueryRules: {
    when: {
        exists: string[];
    };
    format: ({
        constant: string;
        field?: undefined;
        fieldsPrefix?: undefined;
    } | {
        field: string;
        constant?: undefined;
        fieldsPrefix?: undefined;
    } | {
        fieldsPrefix: string;
        constant?: undefined;
        field?: undefined;
    })[];
}[];
