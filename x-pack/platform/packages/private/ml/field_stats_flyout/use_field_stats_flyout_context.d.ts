import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
/**
 * Represents the properties for the MLJobWizardFieldStatsFlyout component.
 */
interface MLJobWizardFieldStatsFlyoutProps {
    isFlyoutVisible: boolean;
    setIsFlyoutVisible: (v: boolean) => void;
    toggleFlyoutVisible: () => void;
    setFieldName: (v: string | undefined) => void;
    fieldName?: string;
    setFieldValue: (v: string) => void;
    fieldValue?: string | number;
    timeRangeMs?: TimeRangeMs;
    populatedFields?: Set<string>;
}
/**
 * Context for the ML Field Stats Flyout.
 */
export declare const MLFieldStatsFlyoutContext: import("react").Context<MLJobWizardFieldStatsFlyoutProps>;
/**
 * Retrieves the context for the field stats flyout.
 * @returns The field stats flyout context.
 */
export declare function useFieldStatsFlyoutContext(): MLJobWizardFieldStatsFlyoutProps;
export {};
