export declare const filebeatHaproxyRules: {
    when: {
        exists: string[];
    };
    format: ({
        field: string;
        constant?: undefined;
    } | {
        constant: string;
        field?: undefined;
    })[];
}[];
