import { Rule } from './rule';
/** The allowed types for field rule values */
export type FieldRuleValue = string | number | null | boolean | Array<string | number | null | boolean>;
/**
 * Represents a single field rule.
 * Ex: "username = 'foo'"
 */
export declare class FieldRule extends Rule {
    readonly field: string;
    readonly value: FieldRuleValue;
    constructor(field: string, value: FieldRuleValue);
    /** {@see Rule.getDisplayTitle} */
    getDisplayTitle(): string;
    /** {@see Rule.clone} */
    clone(): FieldRule;
    /** {@see Rule.toRaw} */
    toRaw(): {
        field: {
            [x: string]: string | number | boolean | (string | number | boolean | null)[] | null;
        };
    };
}
