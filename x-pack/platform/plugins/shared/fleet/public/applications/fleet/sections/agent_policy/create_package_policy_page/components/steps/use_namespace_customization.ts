/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { isNamespaceAllowedByPrefixes } from '../../../../../../../../common/services';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../../constants';
import { useGetPackagePoliciesQuery } from '../../../../../hooks';
import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import type { PackageInfo } from '../../../../../types';

interface Params {
  packageInfo: PackageInfo | undefined;
  namespace: string | undefined;
  onEnabledChange: ((enabled: boolean) => void) | undefined;
  isManaged: boolean;
  packagePolicyId: string | undefined;
}

interface Result {
  showToggle: boolean;
  currentNamespace: string;
  isPrefixAllowed: boolean;
  isToggleDisabled: boolean;
  namespaceCustomizationEnabled: boolean;
  isOptedIn: boolean;
  otherPoliciesCount: number;
  showOptInImpactWarning: boolean;
  showOptOutImpactWarning: boolean;
  handleToggleChange: (enabled: boolean) => void;
}

export function useNamespaceCustomization({
  packageInfo,
  namespace,
  onEnabledChange,
  isManaged,
  packagePolicyId,
}: Params): Result {
  const { allowedNamespacePrefixes } = useSpaceSettingsContext();

  const installedEnabledFor = useMemo(
    () =>
      packageInfo && 'installationInfo' in packageInfo
        ? packageInfo.installationInfo?.namespace_customization_enabled_for ?? []
        : [],
    [packageInfo]
  );

  const showToggle = onEnabledChange !== undefined;

  const currentNamespace = namespace?.trim() ?? '';

  const prefixesForCheck =
    allowedNamespacePrefixes && allowedNamespacePrefixes.length > 0
      ? allowedNamespacePrefixes
      : null;

  const isPrefixAllowed = currentNamespace
    ? isNamespaceAllowedByPrefixes(currentNamespace, prefixesForCheck)
    : true;

  const isToggleDisabled = !currentNamespace || isManaged || !isPrefixAllowed;

  const [namespaceCustomizationEnabled, setNamespaceCustomizationEnabledInternal] =
    useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Initialize toggle from installed state once packageInfo is available.
  // The !packageInfo guard prevents the effect from marking as initialized
  // before the async packageInfo load completes.
  useEffect(() => {
    if (initialized || !namespace || !packageInfo) {
      return;
    }
    setNamespaceCustomizationEnabledInternal(installedEnabledFor.includes(namespace.trim()));
    setInitialized(true);
  }, [installedEnabledFor, namespace, initialized, packageInfo]);

  const handleToggleChange = useCallback(
    (enabled: boolean) => {
      setNamespaceCustomizationEnabledInternal(enabled);
      onEnabledChange?.(enabled);
    },
    [onEnabledChange]
  );

  // Auto-reset the toggle when the namespace changes to one that can't use customization,
  // so stale "enabled" state doesn't persist across namespace edits or form reuse.
  useEffect(() => {
    if (isToggleDisabled && namespaceCustomizationEnabled) {
      setNamespaceCustomizationEnabledInternal(false);
      onEnabledChange?.(false);
    }
  }, [isToggleDisabled, namespaceCustomizationEnabled, onEnabledChange]);

  const isOptedIn = !!installedEnabledFor?.includes(currentNamespace);

  // Query other policies for the same package + namespace to determine impact warnings.
  const otherPoliciesQuery = useGetPackagePoliciesQuery(
    {
      perPage: SO_SEARCH_LIMIT,
      page: 1,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:"${
        packageInfo?.name ?? ''
      }" and ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.namespace:"${currentNamespace}"`,
    },
    {
      enabled:
        showToggle &&
        !!packageInfo &&
        !isToggleDisabled &&
        !!namespaceCustomizationEnabled !== isOptedIn,
    }
  );

  const otherPoliciesCount =
    otherPoliciesQuery.data?.items?.filter((item) => item.id !== packagePolicyId).length ?? 0;

  return {
    showToggle,
    currentNamespace,
    isPrefixAllowed,
    isToggleDisabled,
    namespaceCustomizationEnabled,
    isOptedIn,
    otherPoliciesCount,
    showOptInImpactWarning: !!namespaceCustomizationEnabled && !isOptedIn && otherPoliciesCount > 0,
    showOptOutImpactWarning: !namespaceCustomizationEnabled && isOptedIn && otherPoliciesCount > 0,
    handleToggleChange,
  };
}
