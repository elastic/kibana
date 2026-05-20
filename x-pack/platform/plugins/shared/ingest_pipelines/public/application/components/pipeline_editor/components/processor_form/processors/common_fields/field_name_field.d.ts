import type { FunctionComponent } from 'react';
import React from 'react';
import type { ValidationConfig } from '../../../../../../../shared_imports';
import type { FieldsConfig } from '../shared';
export declare const fieldsConfig: FieldsConfig;
interface Props {
    helpText?: React.ReactNode;
    /**
     * The field name requires a value. Processor specific validation
     * checks can be added here.
     */
    additionalValidations?: ValidationConfig[];
}
export declare const FieldNameField: FunctionComponent<Props>;
export {};
