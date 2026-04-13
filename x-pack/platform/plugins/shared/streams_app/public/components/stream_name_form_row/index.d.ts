import type { ReactNode } from 'react';
import React from 'react';
import type { StatefulStreamsAppRouter } from '../../hooks/use_streams_app_router';
interface StreamNameFormRowProps {
    onChange?: (value: string) => void;
    setLocalStreamName?: React.Dispatch<React.SetStateAction<string>>;
    readOnly?: boolean;
    autoFocus?: boolean;
    error?: string;
    isInvalid?: boolean;
    helpText?: string;
    errorMessage?: ReactNode | string | undefined;
    isStreamNameValid?: boolean;
    partitionName: string;
    prefix?: string;
}
export declare const getHelpText: (isStreamNameEmpty: boolean, readOnly: boolean) => string | undefined;
export declare const getErrorMessage: (baseValidationError: string | undefined, isDuplicatedName: boolean, rootChildExists: boolean, isDotPresent: boolean, prefix: string, rootChild: string, router: StatefulStreamsAppRouter) => ReactNode | string | undefined;
interface ChildStreamInputHookResponse {
    localStreamName: string;
    setLocalStreamName: React.Dispatch<React.SetStateAction<string>>;
    isStreamNameValid: boolean;
    prefix: string;
    partitionName: string;
    helpText: string | undefined;
    errorMessage: ReactNode | string | undefined;
}
/**
 * Custom hook that handles computations necessary for child stream input component instances.
 * Used by parent components to lift up the states needed for the local input field so validation concerns can be shared across components.
 * @param streamName - The stream name to use for the local input field.
 * @param readOnly - Whether the input field is read only.
 * @returns An object containing local states, input validation flags, and help/error messages.
 * @example
 * const { localStreamName, setLocalStreamName, isStreamNameValid, prefix, partitionName, helpText, errorMessage } = useChildStreamInput('logs.linux');
 * return (
 *   <StreamNameFormRow
 *     localStreamName={localStreamName}
 *     setLocalStreamName={setLocalStreamName}
 *     isStreamNameValid={isStreamNameValid}
 *     prefix={prefix}
 *     partitionName={partitionName}
 *     helpText={helpText}
 *     errorMessage={errorMessage}
 *   />
 * );
 */
export declare const useChildStreamInput: (streamName: string, readOnly?: boolean) => ChildStreamInputHookResponse;
export declare function StreamNameFormRow({ onChange, setLocalStreamName, readOnly, autoFocus, error, isInvalid, helpText, errorMessage, isStreamNameValid, partitionName, prefix, }: StreamNameFormRowProps): React.JSX.Element;
export {};
