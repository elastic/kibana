import type { ChangeEventHandler, FocusEventHandler, ReactEventHandler } from 'react';
export type FormReturnTuple<Values, Result> = [FormState<Values, Result>, FormProps];
export interface FormProps {
    onSubmit: ReactEventHandler;
    onChange: ChangeEventHandler<HTMLFormElement & HTMLInputElement>;
    onBlur: FocusEventHandler<HTMLFormElement & HTMLInputElement>;
}
export interface FormOptions<Values, Result> {
    onSubmit: SubmitCallback<Values, Result>;
    validate: ValidateCallback<Values>;
    defaultValues: Values;
}
/**
 * Returns state and {@link HTMLFormElement} event handlers useful for creating
 * forms with inline validation.
 *
 * @see {@link useFormState} if you don't want to use {@link HTMLFormElement}.
 *
 * @example
 * ```typescript
 * const [form, eventHandlers] = useForm({
 *   onSubmit: (values) => apiClient.create(values),
 *   validate: (values) => !values.email ? { email: 'Required' } : {}
 * });
 *
 * <EuiForm component="form" {...eventHandlers}>
 *   <EuiFieldText name="email" isInvalid={form.touched.email && form.errors.email} />
 *   <EuiButton type="submit">Submit</EuiButton>
 * <EuiForm>
 * ```
 */
export declare function useForm<Values extends FormValues, Result>(options: FormOptions<Values, Result>): FormReturnTuple<Values, Result>;
export type FormValues = Record<string, any>;
export type SubmitCallback<Values, Result> = (values: Values) => Promise<Result>;
export type ValidateCallback<Values> = (values: Values) => ValidationErrors<Values> | Promise<ValidationErrors<Values>>;
export type ValidationErrors<Values> = DeepMap<Values, string>;
export type TouchedFields<Values> = DeepMap<Values, boolean>;
export interface FormState<Values, Result> {
    setValue(name: string, value: any): Promise<void>;
    setError(name: string, message: string): void;
    setTouched(name: string): Promise<void>;
    reset(values: Values): void;
    submit(): Promise<Result | undefined>;
    values: Values;
    errors: ValidationErrors<Values>;
    touched: TouchedFields<Values>;
    isValidating: boolean;
    isSubmitting: boolean;
    submitError: Error | undefined;
    isInvalid: boolean;
    isSubmitted: boolean;
}
/**
 * Returns state useful for creating forms with inline validation.
 *
 * @example
 * ```typescript
 * const form = useFormState({
 *   onSubmit: (values) => apiClient.create(values),
 *   validate: (values) => !values.toggle ? { toggle: 'Required' } : {}
 * });
 *
 * <EuiSwitch
 *   checked={form.values.toggle}
 *   onChange={(e) => form.setValue('toggle', e.target.checked)}
 *   onBlur={() => form.setTouched('toggle')}
 *   isInvalid={!!form.errors.toggle}
 * />
 * <EuiButton onClick={form.submit}>
 *   Submit
 * </EuiButton>
 * ```
 */
export declare function useFormState<Values extends FormValues, Result>({ onSubmit, validate, defaultValues, }: FormOptions<Values, Result>): FormState<Values, Result>;
type DeepMap<T, TValue> = {
    [K in keyof T]?: T[K] extends any[] ? T[K][number] extends object ? Array<DeepMap<T[K][number], TValue>> : TValue : T[K] extends object ? DeepMap<T[K], TValue> : TValue;
};
export {};
