/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../../common/constants';
import { useUiSetting, useKibana } from './kibana_react';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import { AuthenticatedUser } from '../../../../../../plugins/security/common/model';
import { convertToCamelCase } from '../../containers/case/utils';

export const useDateFormat = (): string => useUiSetting<string>(DEFAULT_DATE_FORMAT);

export const useTimeZone = (): string => {
  const timeZone = useUiSetting<string>(DEFAULT_DATE_FORMAT_TZ);
  return timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};

export const useBasePath = (): string => useKibana().services.http.basePath.get();

interface UserRealm {
  name: string;
  type: string;
}

export interface AuthenticatedElasticUser {
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  enabled: boolean;
  metadata?: {
    _reserved: boolean;
  };
  authenticationRealm: UserRealm;
  lookupRealm: UserRealm;
  authenticationProvider: string;
}

export const useCurrentUser = (): AuthenticatedElasticUser | null => {
  const [user, setUser] = useState<AuthenticatedElasticUser | null>(null);

  const [, dispatchToaster] = useStateToaster();

  const { security } = useKibana().services;

  const fetchUser = useCallback(() => {
    let didCancel = false;
    const fetchData = async () => {
      try {
        const response = await security.authc.getCurrentUser();
        if (!didCancel) {
          setUser(convertToCamelCase<AuthenticatedUser, AuthenticatedElasticUser>(response));
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.translate('xpack.siem.getCurrentUser.Error', {
              defaultMessage: 'Error getting user',
            }),
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          setUser(null);
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [security]);

  useEffect(() => {
    fetchUser();
  }, []);
  return user;
};
