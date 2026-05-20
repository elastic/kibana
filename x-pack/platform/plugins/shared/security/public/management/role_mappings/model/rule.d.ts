/**
 * Represents a Role Mapping rule.
 */
export declare abstract class Rule {
    /**
     * Converts this rule into a raw object for use in the persisted Role Mapping.
     */
    abstract toRaw(): Record<string, any>;
    /**
     * The display title for this rule.
     */
    abstract getDisplayTitle(): string;
    /**
     * Returns a new instance of this rule.
     */
    abstract clone(): Rule;
}
