import type { FunctionComponent } from 'react';
import type { ILicense } from '../../../../../../../types';
export declare const extractProcessorDetails: (o: {}) => {
    forLicenseAtLeast?: any;
    label: any;
    value: string;
    category: any;
}[];
interface ProcessorTypeAndLabel {
    value: string;
    label: string;
}
type ProcessorWithCategory = ProcessorTypeAndLabel & {
    category: string;
};
export declare const getProcessorTypesAndLabels: (license: ILicense | null) => {
    label: any;
    value: string;
    category: any;
}[];
export declare const groupProcessorsByCategory: (filteredProcessors: ProcessorWithCategory[]) => {
    label: string;
    options: {
        label: string;
        value: string;
    }[];
}[];
interface Props {
    initialType?: string;
}
export declare const ProcessorTypeField: FunctionComponent<Props>;
export {};
