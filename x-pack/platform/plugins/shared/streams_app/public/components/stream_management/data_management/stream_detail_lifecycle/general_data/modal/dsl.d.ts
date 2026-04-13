import React from 'react';
import type { IngestStreamLifecycleAll, IngestStreamLifecycleDSL } from '@kbn/streams-schema';
interface Props {
    initialValue: IngestStreamLifecycleAll;
    isDisabled: boolean;
    setLifecycle: (lifecycle: IngestStreamLifecycleDSL) => void;
    setSaveButtonDisabled: (isDisabled: boolean) => void;
}
export declare const DEFAULT_RETENTION_VALUE = "90";
export declare const DEFAULT_RETENTION_UNIT: {
    name: string;
    value: string;
};
export declare function DslField({ initialValue, isDisabled, setLifecycle, setSaveButtonDisabled }: Props): React.JSX.Element;
export {};
