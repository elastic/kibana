import type { ReactNode } from 'react';
import type { LicenseType } from '../../../../../types';
import type { FormFieldsComponent } from '../processor_form/processors';
interface FieldDescriptor {
    FieldsComponent?: FormFieldsComponent;
    docLinkPath: string;
    /**
     * A sentence case label that can be displayed to users
     */
    label: string;
    /**
     * A general description of the processor type
     */
    typeDescription?: string | ((esDocUrl: string) => ReactNode);
    /**
     * Default
     */
    getDefaultDescription: (processorOptions: Record<string, any>) => string | undefined;
    /**
     * Some processors are only available for certain license types
     */
    forLicenseAtLeast?: LicenseType;
    /**
     * Processors are grouped by category in the processors dropdown
     */
    category: string;
}
type MapProcessorTypeToDescriptor = Record<string, FieldDescriptor>;
export declare const mapProcessorTypeToDescriptor: () => MapProcessorTypeToDescriptor;
export type ProcessorType = keyof ReturnType<typeof mapProcessorTypeToDescriptor>;
export declare const getProcessorDescriptor: (type: ProcessorType | string) => FieldDescriptor | undefined;
export {};
