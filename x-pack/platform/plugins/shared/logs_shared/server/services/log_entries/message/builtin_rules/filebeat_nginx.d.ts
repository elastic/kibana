export declare const filebeatNginxRules: ({
    when: {
        exists: string[];
        values?: undefined;
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
        values: {
            'event.dataset': string;
        };
        exists?: undefined;
    };
    format: ({
        constant: string;
        field?: undefined;
    } | {
        field: string;
        constant?: undefined;
    })[];
})[];
