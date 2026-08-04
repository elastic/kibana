import { type DataConditionTypeDescriptor } from './types';
export interface CreateFieldChangeDescriptorParams {
    /** Leaf-level scalar alert field names offered in the field dropdown. */
    fields?: string[];
    isLoading?: boolean;
}
/**
 * Builds the built-in `field_change` descriptor: matches when an alert's value
 * for a user-selected field changes from one ingest to the next. Always
 * available and not a singleton — users can stack several `field_change` rows
 * for different fields.
 *
 * The selectable field names are injected here.
 */
export declare const createFieldChangeDescriptor: ({ fields, isLoading, }?: CreateFieldChangeDescriptorParams) => DataConditionTypeDescriptor;
/**
 * Built-in descriptor: matches when an alert's severity changes (any
 * direction). It's marked as a singleton because adding the same row twice
 * makes no semantic difference; the dropdown hides it for new rows once
 * one exists.
 */
export declare const severityChangeDescriptor: DataConditionTypeDescriptor;
/**
 * Built-in descriptor: matches when the alert severity equals a chosen
 * level. Multiple instances are allowed (e.g. `severity equals critical OR
 * severity equals high` is a valid configuration), but with the `ALL`
 * operator two distinct severities can never both be true at once — the
 * descriptor surfaces that via `getWarning`.
 */
export declare const severityEqualsDescriptor: DataConditionTypeDescriptor;
/**
 * Builds the default descriptor list shipped with the package, wiring the
 * `field_change` dropdown to the given (already-fetched) alert field names. The
 * package itself never fetches — consumers pass field names via the snooze
 * component's `fieldOptions` prop.
 */
export declare const buildDataConditionTypes: ({ fields, isLoading, }?: CreateFieldChangeDescriptorParams) => readonly DataConditionTypeDescriptor[];
/**
 * Default descriptor list with an empty `field_change` dropdown, used as a
 * fallback when no field names are supplied.
 */
export declare const DEFAULT_DATA_CONDITION_TYPES: readonly DataConditionTypeDescriptor[];
