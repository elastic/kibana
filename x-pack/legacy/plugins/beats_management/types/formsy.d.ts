/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'formsy-react' {
  import React, { FC } from 'react';
  let Formsy: FC<any>;
  export interface FormsyInputProps {
    getErrorMessage(): any;
    getValue(): any;
    hasValue(): boolean;
    isFormDisabled(): boolean;
    isFormSubmitted(): boolean;
    isPristine(): boolean;
    isRequired(): boolean;
    isValid(): boolean;
    isValidValue(): boolean;
    resetValue(): void;
    setValidations(validations: any, required: boolean): void;
    setValue(value: any): void;
    showError(): boolean;
    showRequired(): boolean;
  }

  // eslint-disable-next-line import/no-default-export
  export default Formsy;
  export type FormData<FormShape = any> = { [fieldName in keyof FormShape]: string };
  export type FieldValue = string | null | undefined;

  type ValidationMethod<FormShape> = (
    values: FormData<FormShape>,
    value: string | null | undefined
  ) => void;

  export function addValidationRule<FormShape = {}>(
    validationName: string,
    validationMethod: ValidationMethod<FormShape>
  ): void;
  export function withFormsy(component: any): any;

  // function withFormsy<ComponentProps = any>(
  //   component:
  //     | React.Component<IFormsyDecorator & ComponentProps>
  //     | FC<IFormsyDecorator & ComponentProps>
  // ): React.Component<IFormsyDecorator & ComponentProps>;
}
