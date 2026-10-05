/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';

import type { CoreStart } from '@kbn/core/public';

import type { ChangePasswordProps } from './change_password';
import { getComponents } from './components';
import type { CreateServiceAccountProps } from './create_service_account';
import type { PersonalInfoProps } from './personal_info';

export type { ChangePasswordProps, CreateServiceAccountProps, PersonalInfoProps };

interface GetUiApiOptions {
  core: CoreStart;
  isServerless?: boolean;
  roleManagementEnabled?: boolean;
}

type LazyComponentFn<T> = (props: T) => ReactElement;

export interface UiApi {
  components: {
    getCreateServiceAccount: LazyComponentFn<CreateServiceAccountProps>;
    getPersonalInfo: LazyComponentFn<PersonalInfoProps>;
    getChangePassword: LazyComponentFn<ChangePasswordProps>;
  };
}

export const getUiApi = ({ core, isServerless, roleManagementEnabled }: GetUiApiOptions): UiApi => {
  const components = getComponents({ core, isServerless, roleManagementEnabled });

  return {
    components,
  };
};
