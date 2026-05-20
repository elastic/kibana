import React from 'react';
import type { FleetProxy } from '../../../../types';
export declare function validateName(value: string): string[] | undefined;
export declare function useFleetProxyForm(fleetProxy: FleetProxy | undefined, onSuccess: () => void): {
    isLoading: boolean;
    isDisabled: boolean;
    submit: () => Promise<void>;
    inputs: {
        nameInput: {
            value: string;
            errors: string[] | undefined;
            props: {
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
                value: string;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: string[] | undefined;
                isInvalid: boolean;
            };
            clear: () => void;
            validate: () => boolean;
            setValue: React.Dispatch<React.SetStateAction<string>>;
            setErrors: React.Dispatch<React.SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        urlInput: {
            value: string;
            errors: string[] | undefined;
            props: {
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
                value: string;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: string[] | undefined;
                isInvalid: boolean;
            };
            clear: () => void;
            validate: () => boolean;
            setValue: React.Dispatch<React.SetStateAction<string>>;
            setErrors: React.Dispatch<React.SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        proxyHeadersInput: {
            value: string;
            errors: string[] | undefined;
            props: {
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
                value: string;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: string[] | undefined;
                isInvalid: boolean;
            };
            clear: () => void;
            validate: () => boolean;
            setValue: React.Dispatch<React.SetStateAction<string>>;
            setErrors: React.Dispatch<React.SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        certificateAuthoritiesInput: {
            value: string;
            errors: string[] | undefined;
            props: {
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
                value: string;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: string[] | undefined;
                isInvalid: boolean;
            };
            clear: () => void;
            validate: () => boolean;
            setValue: React.Dispatch<React.SetStateAction<string>>;
            setErrors: React.Dispatch<React.SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        certificateInput: {
            value: string;
            errors: string[] | undefined;
            props: {
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
                value: string;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: string[] | undefined;
                isInvalid: boolean;
            };
            clear: () => void;
            validate: () => boolean;
            setValue: React.Dispatch<React.SetStateAction<string>>;
            setErrors: React.Dispatch<React.SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        certificateKeyInput: {
            value: string;
            errors: string[] | undefined;
            props: {
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
                value: string;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: string[] | undefined;
                isInvalid: boolean;
            };
            clear: () => void;
            validate: () => boolean;
            setValue: React.Dispatch<React.SetStateAction<string>>;
            setErrors: React.Dispatch<React.SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
    };
};
