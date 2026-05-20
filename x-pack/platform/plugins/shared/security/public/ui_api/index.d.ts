import type { ReactElement } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ChangePasswordProps } from './change_password';
import type { PersonalInfoProps } from './personal_info';
export type { ChangePasswordProps, PersonalInfoProps };
interface GetUiApiOptions {
    core: CoreStart;
}
type LazyComponentFn<T> = (props: T) => ReactElement;
export interface UiApi {
    components: {
        getPersonalInfo: LazyComponentFn<PersonalInfoProps>;
        getChangePassword: LazyComponentFn<ChangePasswordProps>;
    };
}
export declare const getUiApi: ({ core }: GetUiApiOptions) => UiApi;
