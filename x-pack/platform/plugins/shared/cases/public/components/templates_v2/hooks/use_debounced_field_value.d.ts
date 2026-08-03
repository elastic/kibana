export interface DebouncedFieldValue<T> {
    value: T;
    setValue: (next: T) => void;
    /** Applies any pending change immediately (call on blur so Save always sees the latest value). */
    flush: () => void;
}
/**
 * Holds a field value locally (so typing is instant) while debouncing the expensive propagation to
 * a parent — YAML re-serialization, local-storage writes, and the render-panel re-render. Without
 * this, every keystroke in the render panel does that work synchronously and the inputs feel laggy.
 *
 * Re-syncs from `external` (value-compared) when it changes from outside the field — e.g. a direct
 * YAML edit or a template load. Call `flush` on blur so the value is committed before Save reads it.
 */
export declare const useDebouncedFieldValue: <T>(external: T, propagate: (next: T) => void, delayMs?: number) => DebouncedFieldValue<T>;
