import type { Observer } from './fields/observer';
export interface APMBaseDoc {
    '@timestamp': string;
    agent: {
        name: string;
        version?: string;
    };
    parent?: {
        id?: string;
    };
    trace?: {
        id?: string;
    };
    labels?: {
        [key: string]: string | number | boolean;
    };
    observer?: Observer;
}
