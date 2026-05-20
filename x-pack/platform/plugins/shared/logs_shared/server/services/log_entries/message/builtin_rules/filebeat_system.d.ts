export declare const filebeatSystemRules: {
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
