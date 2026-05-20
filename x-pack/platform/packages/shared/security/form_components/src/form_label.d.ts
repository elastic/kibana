import type { FC, PropsWithChildren } from 'react';
export interface FormLabelProps {
    /**
     * Name of target form field.
     */
    for: string;
}
/**
 * Component that visually indicates whether a field value has changed.
 *
 * @example Renders a dot next to "Email" label when field value changes.
 * ```typescript
 * <Formik>
 *   <FormChanges>
 *     <FormRow label={<FormLabel for="email">Email</FormLabel>}>
 *       <FormField name="email" />
 *     </FormRow>
 *   </FormChanges>
 * </Formik>
 * ```
 *
 * @throws Error if not a child of a `<Formik>` component.
 * @throws Error if not a child of a `<FormChanges>` component.
 */
export declare const FormLabel: FC<PropsWithChildren<FormLabelProps>>;
