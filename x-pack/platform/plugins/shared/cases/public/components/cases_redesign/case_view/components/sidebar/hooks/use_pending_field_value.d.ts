export interface UsePendingFieldValueArgs<T> {
    committedValue: T;
    onSubmit: (value: T) => void;
    validate?: (value: T) => string | null;
}
export interface UsePendingFieldValueResult<T> {
    currentValue: T;
    hasPendingChange: boolean;
    validationError: string | null;
    setPendingValue: (value: T) => void;
    onConfirm: () => void;
    onCancel: () => void;
}
/**
 * Drives the "pending value + confirm/cancel" interaction shared by the redesigned sidebar's
 * inline-editable fields: a local override of `committedValue` that only takes effect once
 * confirmed, and reverts to the committed value on cancel. Uses a dedicated sentinel (rather
 * than `null`/`undefined`) to mean "no pending change", so it works for any `T` including
 * ones whose valid values include `null`/`undefined` (e.g. a clearable category).
 */
export declare const usePendingFieldValue: <T>({ committedValue, onSubmit, validate, }: UsePendingFieldValueArgs<T>) => UsePendingFieldValueResult<T>;
