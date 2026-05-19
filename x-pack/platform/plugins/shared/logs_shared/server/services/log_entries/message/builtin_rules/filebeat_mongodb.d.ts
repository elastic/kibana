export declare const filebeatMongodbRules: {
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
