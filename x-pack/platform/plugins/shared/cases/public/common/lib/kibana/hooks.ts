/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { NavigateToAppOptions } from '@kbn/core/public';
import { getUICapabilities } from '../../../client/helpers/capabilities';
import { convertToCamelCase } from '../../../api/utils';
import {
  FEATURE_ID_V3,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
} from '../../../../common/constants';
import type { CasesPermissions } from '../../../../common';
import type { StartServices } from '../../../types';
import { useUiSetting, useKibana } from './kibana_react';

export const useDateFormat = (): string => useUiSetting<string>(DEFAULT_DATE_FORMAT);

export const useTimeZone = (): string => {
  const timeZone = useUiSetting<string>(DEFAULT_DATE_FORMAT_TZ);
  return timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};

export const useToasts = (): StartServices['notifications']['toasts'] =>
  useKibana().services.notifications.toasts;

export const useHttp = (): StartServices['http'] => useKibana().services.http;

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

  const toasts = useToasts();

  const { security } = useKibana().services;

  const fetchUser = useCallback(() => {
    let didCancel = false;
    const fetchData = async () => {
      try {
        if (security != null) {
          const response = await security.authc.getCurrentUser();
          if (!didCancel) {
            setUser(convertToCamelCase<AuthenticatedUser, AuthenticatedElasticUser>(response));
          }
        } else {
          setUser({
            username: i18n.translate('xpack.cases.getCurrentUser.unknownUser', {
              defaultMessage: 'Unknown',
            }),
            email: '',
            fullName: '',
            roles: [],
            enabled: false,
            authenticationRealm: { name: '', type: '' },
            lookupRealm: { name: '', type: '' },
            authenticationProvider: '',
          });
        }
      } catch (error) {
        if (!didCancel) {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.cases.getCurrentUser.Error', {
                defaultMessage: 'Error getting user',
              }),
            }
          );
          setUser(null);
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [security, toasts]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  return user;
};

/**
 * Returns a full URL to the provided page path by using
 * kibana's `getUrlForApp()`
 */
export const useAppUrl = (appId?: string) => {
  const { getUrlForApp } = useKibana().services.application;

  const getAppUrl = useCallback(
    (options?: { deepLinkId?: string; path?: string; absolute?: boolean }) =>
      getUrlForApp(appId ?? '', options),
    [appId, getUrlForApp]
  );
  return { getAppUrl };
};

/**
 * Navigate to any app using kibana's `navigateToApp()`
 * or by url using `navigateToUrl()`
 */
export const useNavigateTo = (appId?: string) => {
  const { navigateToApp, navigateToUrl } = useKibana().services.application;

  const navigateTo = useCallback(
    ({
      url,
      ...options
    }: {
      url?: string;
    } & NavigateToAppOptions) => {
      if (url) {
        navigateToUrl(url);
      } else {
        navigateToApp(appId ?? '', options);
      }
    },
    [appId, navigateToApp, navigateToUrl]
  );
  return { navigateTo };
};

/**
 * Returns navigateTo and getAppUrl navigation hooks
 *
 */
export const useNavigation = (appId?: string) => {
  const { navigateTo } = useNavigateTo(appId);
  const { getAppUrl } = useAppUrl(appId);
  return { navigateTo, getAppUrl };
};

interface Capabilities {
  crud: boolean;
  read: boolean;
}
interface UseApplicationCapabilities {
  actions: Capabilities;
  generalCasesV3: CasesPermissions;
  visualize: Capabilities;
  dashboard: Capabilities;
}

/**
 * Returns the capabilities of various applications
 *
 */

export const useApplicationCapabilities = (): UseApplicationCapabilities => {
  const capabilities = useKibana().services?.application?.capabilities;
  const casesCapabilities = capabilities[FEATURE_ID_V3];
  const permissions = getUICapabilities(casesCapabilities);

  return useMemo(
    () => ({
      actions: { crud: !!capabilities.actions?.save, read: !!capabilities.actions?.show },
      generalCasesV3: {
        all: permissions.all,
        create: permissions.create,
        read: permissions.read,
        update: permissions.update,
        delete: permissions.delete,
        push: permissions.push,
        connectors: permissions.connectors,
        settings: permissions.settings,
        reopenCase: permissions.reopenCase,
        createComment: permissions.createComment,
        assign: permissions.assign,
      },
      visualize: {
        crud: !!capabilities.visualize_v2?.save,
        read: !!capabilities.visualize_v2?.show,
      },
      dashboard: {
        crud: !!capabilities.dashboard_v2?.createNew,
        read: !!capabilities.dashboard_v2?.show,
      },
    }),
    [
      capabilities.actions?.save,
      capabilities.actions?.show,
      capabilities.dashboard_v2?.createNew,
      capabilities.dashboard_v2?.show,
      capabilities.visualize_v2?.save,
      capabilities.visualize_v2?.show,
      permissions.all,
      permissions.create,
      permissions.read,
      permissions.update,
      permissions.delete,
      permissions.push,
      permissions.connectors,
      permissions.settings,
      permissions.reopenCase,
      permissions.createComment,
      permissions.assign,
    ]
  );
};
