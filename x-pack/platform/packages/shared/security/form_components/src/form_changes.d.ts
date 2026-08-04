export interface FormChangesProps {
    /**
     * Number of fields rendered on the page that have changed.
     */
    count: number;
    /**
     * Callback function used by a form field to indicate whether its current value is different to its initial value.
     *
     * @example
     * ```
     * const { report } = useFormChangesContext();
     * const isEqual = formik.values.email === formik.initialValues.email;
     *
     * useEffect(() => report(isEqual), [isEqual]);
     * ```
     */
    report: ReportFunction;
}
export type ReportFunction = (isEqual: boolean) => undefined | RevertFunction;
export type RevertFunction = () => void;
/**
 * Custom React hook that allows tracking changes within a form.
 *
 * @example
 * ```
 * const { count } = useFormChanges(); // Form has {count} unsaved changes
 * ```
 */
export declare const useFormChanges: () => FormChangesProps;
export declare const FormChangesProvider: import("react").Provider<FormChangesProps | undefined>;
/**
 * Custom React hook that returns all @see FormChangesProps state from context.
 *
 * @throws Error if called within a component that isn't a child of a `<FormChanges>` component.
 */
export declare function useFormChangesContext(): FormChangesProps;
