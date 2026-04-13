import type { FunctionComponent } from 'react';
export interface FailureStoreFormProps {
    failureStoreEnabled: boolean;
    defaultRetentionPeriod?: string;
    customRetentionPeriod?: string;
    retentionDisabled?: boolean;
}
export type FailureStoreFormData = {
    failureStoreEnabled: boolean;
} & ({
    inherit: boolean;
} | {
    customRetentionPeriod?: string;
} | {
    retentionDisabled?: boolean;
});
interface Props {
    onCloseModal: () => void;
    onSaveModal: (data: FailureStoreFormData) => Promise<void> | void;
    failureStoreProps: FailureStoreFormProps;
    inheritOptions?: {
        canShowInherit: boolean;
        isWired: boolean;
        isCurrentlyInherited: boolean;
    };
    showIlmDescription?: boolean;
    canShowDisableLifecycle?: boolean;
    disableButtonLabel?: string;
}
export declare const FailureStoreModal: FunctionComponent<Props>;
export {};
