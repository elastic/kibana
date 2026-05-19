import type { EuiFormRowProps } from '@elastic/eui';
import type { FunctionComponent } from 'react';
export interface FormRowProps {
    /**
     * Optional name of form field.
     *
     * If not provided the name will be inferred from its child element.
     */
    name?: string;
}
/**
 * Component that renders a form row with all error states for inline validation.
 *
 * @example
 * ```typescript
 * <Formik>
 *   <FormRow label="Email">
 *     <FormField name="email" />
 *   </FormRow>
 * </Formik>
 * ```
 *
 * @throws Error if not a child of a `<Formik>` component.
 * @throws Error if `name` prop is not set and can't be inferred from its child element.
 */
export declare const FormRow: FunctionComponent<EuiFormRowProps & FormRowProps>;
export declare const OptionalText: FunctionComponent;
