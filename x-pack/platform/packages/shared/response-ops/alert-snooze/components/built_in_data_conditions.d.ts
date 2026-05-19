import { type DataConditionTypeDescriptor } from './types';
/**
 * Built-in descriptor: matches when an alert's value for a user-supplied
 * field changes from one ingest to the next. Always available and not a
 * singleton — users can stack several `field_change` rows for different
 * fields.
 */
export declare const fieldChangeDescriptor: DataConditionTypeDescriptor;
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
 * Default descriptor list shipped with the package.
 */
export declare const DEFAULT_DATA_CONDITION_TYPES: readonly DataConditionTypeDescriptor[];
