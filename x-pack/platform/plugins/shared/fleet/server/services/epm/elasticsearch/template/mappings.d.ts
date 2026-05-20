import type { Field } from '../../fields/field';
interface Properties {
    [key: string]: any;
}
export declare function getDefaultProperties(field: Field): Properties;
export declare function scaledFloat(field: Field): Properties;
export declare function histogram(field: Field): Properties;
export declare function keyword(field: Field, isDynamic?: boolean): Properties;
export {};
