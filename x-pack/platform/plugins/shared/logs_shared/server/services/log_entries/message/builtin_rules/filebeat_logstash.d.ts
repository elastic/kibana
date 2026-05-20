export declare const filebeatLogstashRules: ({
    when: {
        exists: string[];
        all?: undefined;
    };
    format: ({
        constant: string;
        field?: undefined;
    } | {
        field: string;
        constant?: undefined;
    })[];
} | {
    when: {
        all: ({
            exists: string[];
            existsPrefix?: undefined;
        } | {
            existsPrefix: string[];
            exists?: undefined;
        })[];
        exists?: undefined;
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
})[];
