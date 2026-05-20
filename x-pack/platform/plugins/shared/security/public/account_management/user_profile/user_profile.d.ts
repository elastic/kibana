import type { FunctionComponent } from 'react';
import React from 'react';
import type { ContrastModeValue, DarkModeValue, LocaleValue, UserProfileData } from '@kbn/user-profile-components';
import type { AuthenticatedUser } from '../../../common';
export interface UserProfileProps {
    user: AuthenticatedUser;
    data?: UserProfileData;
}
export interface UserDetailsEditorProps {
    user: AuthenticatedUser;
}
export interface UserSettingsEditorProps {
    formik: ReturnType<typeof useUserProfileForm>;
    isThemeOverridden: boolean;
    isOverriddenThemeDarkMode: boolean;
}
export interface UserLocaleEditorProps {
    formik: ReturnType<typeof useUserProfileForm>;
}
export interface UserRoleProps {
    user: AuthenticatedUser;
}
export interface UserProfileFormValues {
    user: {
        full_name: string;
        email: string;
    };
    data?: {
        avatar: {
            initials: string;
            color: string;
            imageUrl: string;
        };
        userSettings: {
            darkMode: DarkModeValue;
            contrastMode: ContrastModeValue;
            locale: LocaleValue;
        };
    };
    avatarType: 'initials' | 'image';
}
export declare const UserLocaleEditor: FunctionComponent<UserLocaleEditorProps>;
export declare const UserProfile: FunctionComponent<UserProfileProps>;
export declare function useUserProfileForm({ user, data }: UserProfileProps): {
    initialValues: UserProfileFormValues;
    initialErrors: import("formik").FormikErrors<unknown>;
    initialTouched: import("formik").FormikTouched<unknown>;
    initialStatus: any;
    handleBlur: {
        (e: React.FocusEvent<any, Element>): void;
        <T = any>(fieldOrEvent: T): T extends string ? (e: any) => void : void;
    };
    handleChange: {
        (e: React.ChangeEvent<any>): void;
        <T_1 = string | React.ChangeEvent<any>>(field: T_1): T_1 extends React.ChangeEvent<any> ? void : (e: string | React.ChangeEvent<any>) => void;
    };
    handleReset: (e: any) => void;
    handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
    resetForm: (nextState?: Partial<import("formik").FormikState<UserProfileFormValues>> | undefined) => void;
    setErrors: (errors: import("formik").FormikErrors<UserProfileFormValues>) => void;
    setFormikState: (stateOrCb: import("formik").FormikState<UserProfileFormValues> | ((state: import("formik").FormikState<UserProfileFormValues>) => import("formik").FormikState<UserProfileFormValues>)) => void;
    setFieldTouched: (field: string, touched?: boolean, shouldValidate?: boolean) => Promise<void> | Promise<import("formik").FormikErrors<UserProfileFormValues>>;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => Promise<void> | Promise<import("formik").FormikErrors<UserProfileFormValues>>;
    setFieldError: (field: string, value: string | undefined) => void;
    setStatus: (status: any) => void;
    setSubmitting: (isSubmitting: boolean) => void;
    setTouched: (touched: import("formik").FormikTouched<UserProfileFormValues>, shouldValidate?: boolean) => Promise<void> | Promise<import("formik").FormikErrors<UserProfileFormValues>>;
    setValues: (values: React.SetStateAction<UserProfileFormValues>, shouldValidate?: boolean) => Promise<void> | Promise<import("formik").FormikErrors<UserProfileFormValues>>;
    submitForm: () => Promise<any>;
    validateForm: (values?: UserProfileFormValues | undefined) => Promise<import("formik").FormikErrors<UserProfileFormValues>>;
    validateField: (name: string) => Promise<void> | Promise<string | undefined>;
    isValid: boolean;
    dirty: boolean;
    unregisterField: (name: string) => void;
    registerField: (name: string, { validate }: any) => void;
    getFieldProps: (nameOrOptions: string | import("formik").FieldConfig<any>) => import("formik").FieldInputProps<any>;
    getFieldMeta: (name: string) => import("formik").FieldMetaProps<any>;
    getFieldHelpers: (name: string) => import("formik").FieldHelperProps<any>;
    validateOnBlur: boolean;
    validateOnChange: boolean;
    validateOnMount: boolean;
    values: UserProfileFormValues;
    errors: import("formik").FormikErrors<UserProfileFormValues>;
    touched: import("formik").FormikTouched<UserProfileFormValues>;
    isSubmitting: boolean;
    isValidating: boolean;
    status?: any;
    submitCount: number;
};
export declare const SaveChangesBottomBar: FunctionComponent;
