import React from 'react';
import type { CoreStart } from '@kbn/core/public';
export interface GetComponentsOptions {
    core: CoreStart;
}
export declare const getComponents: ({ core }: GetComponentsOptions) => {
    getPersonalInfo: (props: JSX.IntrinsicAttributes & import("./personal_info").PersonalInfoProps & {
        children?: React.ReactNode | undefined;
    }) => React.JSX.Element;
    getChangePassword: (props: JSX.IntrinsicAttributes & import("./change_password").ChangePasswordProps & {
        children?: React.ReactNode | undefined;
    }) => React.JSX.Element;
};
