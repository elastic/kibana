export interface ResultLinks {
    fileBeat?: {
        enabled: boolean;
    };
}
export type ResultLink = keyof ResultLinks;
export interface ConfigSchema {
    resultLinks?: ResultLinks;
}
