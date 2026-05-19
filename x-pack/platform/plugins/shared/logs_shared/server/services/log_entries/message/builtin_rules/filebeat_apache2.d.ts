export declare const filebeatApache2Rules: ({
    when: {
        existsPrefix: string[];
        values?: undefined;
        exists?: undefined;
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
        existsPrefix?: undefined;
        exists?: undefined;
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
        exists: string[];
        existsPrefix?: undefined;
        values?: undefined;
    };
    format: ({
        constant: string;
        field?: undefined;
    } | {
        field: string;
        constant?: undefined;
    })[];
})[];
