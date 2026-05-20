import type { useSecretInput, useComboInput, useRadioInput, useKeyValueInput } from '../../../../hooks';
import type { useInput, useSwitchInput } from '../../../../hooks';
import type { DownloadSource } from '../../../../types';
export type AuthType = 'none' | 'username_password' | 'api_key';
export interface DownloadSourceFormInputsType {
    nameInput: ReturnType<typeof useInput>;
    defaultDownloadSourceInput: ReturnType<typeof useSwitchInput>;
    hostInput: ReturnType<typeof useInput>;
    proxyIdInput: ReturnType<typeof useInput>;
    sslCertificateInput: ReturnType<typeof useInput>;
    sslKeyInput: ReturnType<typeof useInput>;
    sslKeySecretInput: ReturnType<typeof useSecretInput>;
    sslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
    authTypeInput: ReturnType<typeof useRadioInput>;
    usernameInput: ReturnType<typeof useInput>;
    passwordInput: ReturnType<typeof useInput>;
    passwordSecretInput: ReturnType<typeof useSecretInput>;
    apiKeyInput: ReturnType<typeof useInput>;
    apiKeySecretInput: ReturnType<typeof useSecretInput>;
    headersInput: ReturnType<typeof useKeyValueInput>;
}
export declare function useDowloadSourceFlyoutForm(onSuccess: () => void, downloadSource?: DownloadSource): {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        hostInput: {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        defaultDownloadSourceInput: {
            value: boolean;
            props: {
                onChange: (e: import("@elastic/eui/src/components/form/switch/switch").EuiSwitchEvent) => void;
                checked: boolean;
                disabled: boolean;
            };
            validate: () => true;
            formRowProps: {};
            setValue: import("react").Dispatch<import("react").SetStateAction<boolean>>;
            hasChanged: boolean;
        };
        proxyIdInput: {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        sslCertificateInput: {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        sslKeyInput: {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        sslCertificateAuthoritiesInput: {
            props: {
                id: string;
                value: string[];
                onChange: (newValue: string[]) => void;
                errors: {
                    message: string;
                    index?: number;
                    condition?: boolean;
                }[] | undefined;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: {
                    message: string;
                    index?: number;
                    condition?: boolean;
                }[] | undefined;
                isInvalid: boolean;
            };
            value: string[];
            clear: () => void;
            setValue: import("react").Dispatch<import("react").SetStateAction<string[]>>;
            validate: () => boolean;
            hasChanged: boolean;
        };
        sslKeySecretInput: {
            value: string | {
                id: string;
            } | undefined;
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
                initialValue: string | {
                    id: string;
                } | undefined;
                disabled: boolean;
                clear: () => void;
            };
            cancelEdit: () => void;
            validate: () => boolean;
            setValue: import("react").Dispatch<import("react").SetStateAction<string | {
                id: string;
            } | undefined>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        authTypeInput: {
            props: {
                idSelected: string;
                onChange: import("react").Dispatch<import("react").SetStateAction<string>>;
                disabled: boolean;
            };
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            value: string;
            hasChanged: boolean;
            validate: () => boolean;
        };
        usernameInput: {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        passwordInput: {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        passwordSecretInput: {
            value: string | {
                id: string;
            } | undefined;
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
                initialValue: string | {
                    id: string;
                } | undefined;
                disabled: boolean;
                clear: () => void;
            };
            cancelEdit: () => void;
            validate: () => boolean;
            setValue: import("react").Dispatch<import("react").SetStateAction<string | {
                id: string;
            } | undefined>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        apiKeyInput: {
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
            setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        apiKeySecretInput: {
            value: string | {
                id: string;
            } | undefined;
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
                initialValue: string | {
                    id: string;
                } | undefined;
                disabled: boolean;
                clear: () => void;
            };
            cancelEdit: () => void;
            validate: () => boolean;
            setValue: import("react").Dispatch<import("react").SetStateAction<string | {
                id: string;
            } | undefined>>;
            setErrors: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
            hasChanged: boolean;
        };
        headersInput: {
            props: {
                id: string;
                value: {
                    key: string;
                    value: string;
                }[];
                onChange: (newValue: {
                    key: string;
                    value: string;
                }[]) => void;
                errors: {
                    message: string;
                    index?: number;
                    condition?: boolean;
                }[] | undefined;
                isInvalid: boolean;
                disabled: boolean;
            };
            formRowProps: {
                error: {
                    message: string;
                    index?: number;
                    condition?: boolean;
                }[] | undefined;
                isInvalid: boolean;
            };
            value: {
                key: string;
                value: string;
            }[];
            clear: () => void;
            setValue: import("react").Dispatch<import("react").SetStateAction<{
                key: string;
                value: string;
            }[]>>;
            validate: () => boolean;
            hasChanged: boolean;
        };
    };
    submit: () => Promise<void>;
    isLoading: boolean;
    isDisabled: boolean;
};
export declare function validateHost(value: string): string[] | undefined;
export declare function validateDownloadSourceHeaders(pairs: Array<{
    key: string;
    value: string;
}>, authType?: AuthType): {
    message: string;
    index: number;
    hasKeyError: boolean;
    hasValueError: boolean;
}[] | undefined;
