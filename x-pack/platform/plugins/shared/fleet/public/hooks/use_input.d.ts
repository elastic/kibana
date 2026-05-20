import type React from 'react';
import type { EuiComboBoxOptionOption, EuiSwitchEvent } from '@elastic/eui';
export interface FormInput {
    validate: () => boolean;
}
export declare function validateInputs(inputs: {
    [k: string]: FormInput;
}): boolean;
export declare function useInput(defaultValue?: string, validate?: (value: string) => string[] | undefined, disabled?: boolean): {
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
type MaybeSecret = string | {
    id: string;
} | undefined;
export declare function useSecretInput(initialValue: MaybeSecret, validate?: (value: MaybeSecret) => string[] | undefined, disabled?: boolean): {
    value: MaybeSecret;
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
        initialValue: MaybeSecret;
        disabled: boolean;
        clear: () => void;
    };
    cancelEdit: () => void;
    validate: () => boolean;
    setValue: React.Dispatch<React.SetStateAction<MaybeSecret>>;
    setErrors: React.Dispatch<React.SetStateAction<string[] | undefined>>;
    hasChanged: boolean;
};
export declare function useRadioInput(defaultValue: string, disabled?: boolean): {
    props: {
        idSelected: string;
        onChange: React.Dispatch<React.SetStateAction<string>>;
        disabled: boolean;
    };
    setValue: React.Dispatch<React.SetStateAction<string>>;
    value: string;
    hasChanged: boolean;
    validate: () => boolean;
};
export declare function useSwitchInput(defaultValue?: boolean, disabled?: boolean): {
    value: boolean;
    props: {
        onChange: (e: EuiSwitchEvent) => void;
        checked: boolean;
        disabled: boolean;
    };
    validate: () => true;
    formRowProps: {};
    setValue: React.Dispatch<React.SetStateAction<boolean>>;
    hasChanged: boolean;
};
export declare function useComboInput(id: string, defaultValue?: string[], validate?: (value: string[]) => Array<{
    message: string;
    index?: number;
}> | undefined, disabled?: boolean): {
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
    setValue: React.Dispatch<React.SetStateAction<string[]>>;
    validate: () => boolean;
    hasChanged: boolean;
};
export declare function useKeyValueInput(id: string, defaultValue?: Array<{
    key: string;
    value: string;
}>, validate?: (value: Array<{
    key: string;
    value: string;
}>) => Array<{
    message: string;
    index: number;
    hasKeyError: boolean;
    hasValueError: boolean;
}> | undefined, disabled?: boolean): {
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
    setValue: React.Dispatch<React.SetStateAction<{
        key: string;
        value: string;
    }[]>>;
    validate: () => boolean;
    hasChanged: boolean;
};
export declare function useNumberInput(defaultValue: number | undefined, validate?: (value: number) => number[] | undefined, disabled?: boolean): {
    value: number | undefined;
    errors: number[] | undefined;
    props: {
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
        value: number | undefined;
        isInvalid: boolean;
        disabled: boolean;
    };
    formRowProps: {
        error: number[] | undefined;
        isInvalid: boolean;
    };
    clear: () => void;
    validate: () => boolean;
    setValue: React.Dispatch<React.SetStateAction<number | undefined>>;
    hasChanged: boolean;
};
export declare function useSelectInput(options: Array<{
    value: string;
    text: string;
}>, defaultValue?: string, disabled?: boolean): {
    props: {
        options: {
            value: string;
            text: string;
        }[];
        value: string;
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
        disabled: boolean;
    };
    value: string;
    clear: () => void;
    setValue: React.Dispatch<React.SetStateAction<string>>;
};
export declare function useComboBoxWithCustomInput(id: string, defaultValue?: Array<EuiComboBoxOptionOption<string>>, validate?: (value: Array<EuiComboBoxOptionOption<string>>) => string[] | undefined, disabled?: boolean): {
    props: {
        id: string;
        onChange: (selected: Array<EuiComboBoxOptionOption<string>>) => void;
        onCreateOption: (searchValue: string) => void;
        errors: string[] | undefined;
        isInvalid: boolean;
        disabled: boolean;
        selectedOptions: EuiComboBoxOptionOption<string>[];
    };
    formRowProps: {
        error: string[] | undefined;
        isInvalid: boolean;
    };
    value: string | undefined;
    clear: () => void;
    setSelected: React.Dispatch<React.SetStateAction<EuiComboBoxOptionOption<string>[]>>;
    validate: () => boolean;
};
export {};
