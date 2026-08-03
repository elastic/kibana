import { EuiFieldText } from '@elastic/eui';
import type { FieldValidator } from 'formik';
import type { ComponentPropsWithoutRef, ElementType } from 'react';
import React from 'react';
export interface FormFieldProps<T extends ElementType> {
    as?: T;
    name: string;
    validate?: FieldValidator | ValidateOptions;
}
/**
 * Polymorphic component that renders a form field with all state required for inline validation.
 *
 * @example Text field with validation rule:
 * ```typescript
 * <Formik>
 *   <FormField name="initials" validate={{ required: 'Enter initials.' }} />
 * </Formik>
 * ```
 *
 * @example Color picker using non-standard value prop and change handler:
 * ```typescript
 * <Formik>
 *   <FormField
 *     as={EuiColorPicker}
 *     name="color"
 *     color={formik.values.color}
 *     onChange={(value) => formik.setFieldValue('color', value)}
 *   />
 * </Formik>
 * ```
 *
 * @throws Error if not a child of a `<Formik>` component.
 */
export declare function FormField<T extends ElementType = typeof EuiFieldText>({ as, validate, onBlur, ...rest }: FormFieldProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof FormFieldProps<T>>): React.JSX.Element;
export interface ValidateOptions {
    required?: string;
    pattern?: {
        value: RegExp;
        message: string;
    };
    minLength?: {
        value: number;
        message: string;
    };
    maxLength?: {
        value: number;
        message: string;
    };
    min?: {
        value: number;
        message: string;
    };
    max?: {
        value: number;
        message: string;
    };
}
export declare function createFieldValidator(options: ValidateOptions): FieldValidator;
