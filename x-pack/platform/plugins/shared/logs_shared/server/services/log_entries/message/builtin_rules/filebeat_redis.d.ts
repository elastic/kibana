export declare const filebeatRedisRules: {
    when: {
        exists: string[];
    };
    format: ({
        constant: string;
        field?: undefined;
    } | {
        field: string;
        constant?: undefined;
    })[];
}[];
