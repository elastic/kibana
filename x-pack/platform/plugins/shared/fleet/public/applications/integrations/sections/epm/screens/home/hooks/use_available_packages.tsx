/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useMemo } from 'react';

import { uniq } from 'lodash';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import type { IntegrationPreferenceType } from '../../../components/integration_preference';
import { useAgentless } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks/setup_technology';
import {
  useGetPackagesQuery,
  useGetCategoriesQuery,
  useGetAppendCustomIntegrationsQuery,
  useGetReplacementCustomIntegrationsQuery,
  useGetPackageVerificationKeyId,
} from '../../../../../hooks';
import { useMergeEprPackagesWithReplacements } from '../../../../../hooks/use_merge_epr_with_replacements';

import { mapToCard } from '..';
import type { PackageList, PackageListItem } from '../../../../../types';

import { doesPackageHaveIntegrations } from '../../../../../services';

import {
  isInputOnlyPolicyTemplate,
  isIntegrationPolicyTemplate,
  filterPolicyTemplatesTiles,
} from '../../../../../../../../common/services';

import {
  isOnlyAgentlessPolicyTemplate,
  isOnlyAgentlessIntegration,
  isAgentlessIntegration,
} from '../../../../../../../../common/services/agentless_policy_helper';

import type { IntegrationCardItem } from '..';

import { ALL_CATEGORY } from '../category_facets';
import type { CategoryFacet } from '../category_facets';

import { mergeCategoriesAndCount } from '../util';

import { useBuildIntegrationsUrl } from './use_build_integrations_url';

export interface IntegrationsURLParameters {
  searchString?: string;
  categoryId?: string;
  subCategoryId?: string;
  onlyAgentless?: boolean;
  showDeprecated?: boolean;
}

function getAllCategoriesFromIntegrations(pkg: PackageListItem) {
  if (!doesPackageHaveIntegrations(pkg)) {
    return pkg.categories;
  }

  const allCategories = pkg.policy_templates?.reduce((accumulator, policyTemplate) => {
    if (isInputOnlyPolicyTemplate(policyTemplate)) {
      // input only policy templates do not have categories
      return accumulator;
    }
    return [...accumulator, ...(policyTemplate.categories || [])];
  }, pkg.categories || []);

  return uniq(allCategories);
}

// Packages can export multiple integrations, aka `policy_templates`
// In the case where packages ship >1 `policy_templates`, we flatten out the
// list of packages by bringing all integrations to top-level so that
// each integration is displayed as its own tile
const packageListToIntegrationsList = (packages: PackageList): PackageList => {
  return packages.reduce((acc: PackageList, pkg) => {
    const {
      policy_templates: policyTemplates = [],
      categories: topCategories = [],
      ...restOfPackage
    } = pkg;

    const topPackage = {
      ...restOfPackage,
      categories: getAllCategoriesFromIntegrations(pkg),
    };

    const integrationsPolicyTemplates = doesPackageHaveIntegrations(pkg)
      ? policyTemplates.map((policyTemplate) => {
          const { name, title, description, icons } = policyTemplate;

          const categories =
            isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.categories
              ? policyTemplate.categories
              : [];
          const allCategories = [...topCategories, ...categories];
          return {
            ...restOfPackage,
            id: `${restOfPackage.id}-${name}`,
            integration: name,
            title,
            description,
            icons: icons || restOfPackage.icons,
            categories: uniq(allCategories),
          };
        })
      : [];

    const tiles = filterPolicyTemplatesTiles<PackageListItem>(
      pkg.policy_templates_behavior,
      topPackage,
      integrationsPolicyTemplates
    ).map((tile) => {
      return {
        ...tile,
        supportsAgentless: isAgentlessIntegration(pkg, tile.integration || tile.name),
      };
    });

    return [...acc, ...tiles];
  }, []);
};

// Return filtered packages based on deployment mode,
// Currently filters out agentless only packages and policy templates if agentless is not available
const filterPackageListDeploymentModes = (packages: PackageList, isAgentlessEnabled: boolean) => {
  return isAgentlessEnabled
    ? packages
    : packages
        .filter((pkg) => {
          return !isOnlyAgentlessIntegration(pkg);
        })
        .map((pkg) => {
          pkg.policy_templates = (pkg.policy_templates || []).filter((policyTemplate) => {
            return !isOnlyAgentlessPolicyTemplate(policyTemplate);
          });
          return pkg;
        });
};

export type AvailablePackagesHookType = typeof useAvailablePackages;

export const useAvailablePackages = ({
  prereleaseIntegrationsEnabled,
}: {
  prereleaseIntegrationsEnabled: boolean;
}) => {
  const [preference, setPreference] = useState<IntegrationPreferenceType>('agent');

  const { isAgentlessEnabled } = useAgentless();

  const { packageVerificationKeyId } = useGetPackageVerificationKeyId();

  const {
    initialSelectedCategory,
    initialSubcategory,
    initialOnlyAgentless,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    getHref,
    getAbsolutePath,
    searchParam,
    addBasePath,
  } = useBuildIntegrationsUrl();

  const [selectedCategory, setCategory] = useState(initialSelectedCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>(
    initialSubcategory
  );
  const [searchTerm, setSearchTerm] = useState(searchParam || '');
  const [onlyAgentlessFilter, setOnlyAgentlessFilter] = useState(initialOnlyAgentless);

  const {
    data: eprPackages,
    isLoading: isLoadingAllPackages,
    error: eprPackageLoadingError,
  } = useGetPackagesQuery({ prerelease: prereleaseIntegrationsEnabled });

  // Remove Kubernetes package granularity
  if (eprPackages?.items) {
    eprPackages.items.forEach(function (element) {
      if (element.id === 'kubernetes') {
        element.policy_templates = [];
      }
    });
  }

  const eprIntegrationList = useMemo(() => {
    const filteredPackageList =
      filterPackageListDeploymentModes(eprPackages?.items || [], isAgentlessEnabled) || [];
    const integrations = packageListToIntegrationsList(filteredPackageList);
    return integrations;
  }, [eprPackages?.items, isAgentlessEnabled]);

  const {
    data: replacementCustomIntegrations,
    isInitialLoading: isLoadingReplacmentCustomIntegrations,
  } = useGetReplacementCustomIntegrationsQuery();

  const { isInitialLoading: isLoadingAppendCustomIntegrations, data: appendCustomIntegrations } =
    useGetAppendCustomIntegrationsQuery();

  const mergedEprPackages: Array<PackageListItem | CustomIntegration> =
    useMergeEprPackagesWithReplacements(
      preference === 'beats' ? [] : eprIntegrationList,
      preference === 'agent' ? [] : replacementCustomIntegrations || []
    );

  const cards: IntegrationCardItem[] = useMemo(() => {
    const eprAndCustomPackages = [...mergedEprPackages, ...(appendCustomIntegrations || [])];

    return (
      eprAndCustomPackages
        // If only showing agentless integrations, filter out non-agentless ones
        .filter((item) => {
          if (isAgentlessEnabled && onlyAgentlessFilter) {
            return 'supportsAgentless' in item && item.supportsAgentless === true;
          }
          return true;
        })
        .map((item) => {
          return mapToCard({
            getAbsolutePath,
            getHref,
            item,
            addBasePath,
            packageVerificationKeyId,
          });
        })
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  }, [
    addBasePath,
    appendCustomIntegrations,
    getAbsolutePath,
    getHref,
    mergedEprPackages,
    onlyAgentlessFilter,
    isAgentlessEnabled,
    packageVerificationKeyId,
  ]);

  // Packages to show
  // Filters out based on selected category and subcategory (if any)
  const filteredCards = useMemo(
    () =>
      cards.filter((c) => {
        if (selectedCategory === '') {
          return true;
        }
        if (!selectedSubCategory) return c.categories.includes(selectedCategory);

        return c.categories.includes(selectedSubCategory);
      }),
    [cards, selectedCategory, selectedSubCategory]
  );

  const {
    data: eprCategoriesRes,
    isLoading: isLoadingCategories,
    error: eprCategoryLoadingError,
  } = useGetCategoriesQuery({ prerelease: prereleaseIntegrationsEnabled });

  const eprCategories = useMemo(() => eprCategoriesRes?.items || [], [eprCategoriesRes]);

  const allCategories: CategoryFacet[] = useMemo(() => {
    const eprAndCustomCategories: CategoryFacet[] = isLoadingCategories
      ? []
      : mergeCategoriesAndCount(eprCategories ? eprCategories : [], cards);
    return [
      {
        ...ALL_CATEGORY,
        count: cards.length,
      },
      ...(eprAndCustomCategories ? eprAndCustomCategories : []),
    ];
  }, [cards, eprCategories, isLoadingCategories]);

  // Filter out subcategories
  const mainCategories = useMemo(() => {
    return allCategories.filter((category) => category.parent_id === undefined);
  }, [allCategories]);

  const availableSubCategories = useMemo(() => {
    return allCategories?.filter((c) => c.parent_id === selectedCategory);
  }, [allCategories, selectedCategory]);

  return {
    initialSelectedCategory,
    selectedCategory,
    setCategory,
    allCategories,
    mainCategories,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
    searchTerm,
    setSearchTerm,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    preference,
    setPreference,
    onlyAgentlessFilter,
    setOnlyAgentlessFilter,
    isAgentlessEnabled,
    isLoading:
      isLoadingReplacmentCustomIntegrations ||
      isLoadingAppendCustomIntegrations ||
      isLoadingCategories ||
      isLoadingAllPackages,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    filteredCards,
  };
};
