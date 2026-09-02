/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { ApplicationStart } from '@kbn/core-application-browser';

import { splitPkgKey } from '../../../../../../../common/services';
import { PLUGIN_ID, INTEGRATIONS_PLUGIN_ID } from '../../../../constants';
import { pkgKeyFromPackageInfo } from '../../../../services';
import { useStartServices, useLink, useIntraAppState } from '../../../../hooks';
import type { CreatePackagePolicyRouteState, OnSaveQueryParamKeys } from '../../../../types';
import type { EditPackagePolicyFrom, SavedPolicyResult } from '../types';

import { appendOnSaveQueryParamsToPath } from '../utils';

const ALLOWED_RETURN_APP_IDS = new Set([
  'integrations',
  'observabilityOnboarding',
  'securitySolutionUI',
]);

interface UseCancelParams {
  from: EditPackagePolicyFrom;
  pkgkey: string;
  agentPolicyId?: string;
}

export const useCancelAddPackagePolicy = (params: UseCancelParams) => {
  const { from, pkgkey, agentPolicyId } = params;
  const {
    application: { navigateToApp, getUrlForApp },
  } = useStartServices();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const { getHref } = useLink();
  const { search } = useLocation();

  const cancelClickHandler = useCallback(
    (ev: React.SyntheticEvent) => {
      if (routeState?.onCancelNavigateTo) {
        ev.preventDefault();
        navigateToApp(...routeState.onCancelNavigateTo);
      }
    },
    [routeState, navigateToApp]
  );

  const cancelUrl = useMemo(() => {
    if (routeState && routeState.onCancelUrl) {
      return routeState.onCancelUrl;
    }

    // External apps (Integrations catalog, Security, Observability Onboarding) append
    // returnPath/returnAppId as query params so Cancel returns to the originating page.
    const searchParams = new URLSearchParams(search);
    const returnPath = searchParams.get('returnPath');
    const returnAppId = searchParams.get('returnAppId');
    if (returnPath && returnAppId && ALLOWED_RETURN_APP_IDS.has(returnAppId)) {
      return getUrlForApp(returnAppId, { path: returnPath });
    }

    if (from === 'installed-integrations' || from === 'copy-from-installed-integrations') {
      return `${getHref('integrations_installed', {})}?viewPolicies=${splitPkgKey(pkgkey).pkgName}`;
    }

    return (from === 'policy' || from === 'copy-from-fleet-policy-list') && agentPolicyId
      ? getHref('policy_details', {
          policyId: agentPolicyId,
        })
      : getHref('integration_details_overview', { pkgkey });
  }, [routeState, search, from, agentPolicyId, getHref, getUrlForApp, pkgkey]);

  return { cancelClickHandler, cancelUrl };
};

interface UseOnSaveNavigateParams {
  routeState?: CreatePackagePolicyRouteState;
  queryParamsPolicyId?: string;
}

export const useOnSaveNavigate = (params: UseOnSaveNavigateParams) => {
  const { queryParamsPolicyId } = params;
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const doOnSaveNavigation = useRef<boolean>(true);
  const { getPath } = useLink();

  const {
    application: { navigateToApp },
  } = useStartServices();

  // Detect if user left page
  useEffect(() => {
    return () => {
      doOnSaveNavigation.current = false;
    };
  }, []);

  const onSaveNavigate = useCallback(
    (savedPolicyResult: SavedPolicyResult, paramsToApply: OnSaveQueryParamKeys[] = []) => {
      if (!doOnSaveNavigation.current) {
        return;
      }
      const isAgentless = savedPolicyResult.type === 'agentless';
      const policyIds = isAgentless ? [] : savedPolicyResult.policy.policy_ids;
      let onSaveNavigateTo: Parameters<ApplicationStart['navigateToApp']>;
      let onSaveQueryParams: CreatePackagePolicyRouteState['onSaveQueryParams'];

      if (routeState?.onSaveNavigateTo) {
        onSaveNavigateTo = routeState.onSaveNavigateTo;
        onSaveQueryParams = routeState?.onSaveQueryParams;
      } else {
        // If agentless or came from integrations (no policyId in URL), navigate to the integration's policies table
        if (isAgentless || !queryParamsPolicyId) {
          onSaveNavigateTo = [
            INTEGRATIONS_PLUGIN_ID,
            {
              path: getPath('integration_details_policies', {
                pkgkey: pkgKeyFromPackageInfo(savedPolicyResult.policy.package!),
              }),
            },
          ];

          if (isAgentless) {
            onSaveQueryParams = {
              openEnrollmentFlyout: { policyIdAsValue: true },
            };
          } else {
            onSaveQueryParams = routeState?.onSaveQueryParams;
          }
        }
        // Otherwise, navigate to the policy's first agent policy details page
        // or the overridden policy id from query param instead
        // TODO: handle case where package policy belongs to multiple agent policies
        else {
          onSaveNavigateTo = [
            PLUGIN_ID,
            {
              path: getPath('policy_details', {
                policyId: queryParamsPolicyId || policyIds[0],
              }),
            },
          ];

          onSaveQueryParams = {
            showAddAgentHelp: true,
            openEnrollmentFlyout: true,
          };
        }
      }

      const [appId, options] = onSaveNavigateTo;
      if (options?.path) {
        const pathWithQueryString = appendOnSaveQueryParamsToPath({
          path: options.path,
          savedPolicyResult,
          mappingOptions: onSaveQueryParams,
          paramsToApply,
        });
        navigateToApp(appId, { ...options, path: pathWithQueryString });
      } else {
        navigateToApp(...onSaveNavigateTo);
      }
    },
    [
      getPath,
      routeState?.onSaveNavigateTo,
      routeState?.onSaveQueryParams,
      queryParamsPolicyId,
      navigateToApp,
    ]
  );

  return onSaveNavigate;
};
