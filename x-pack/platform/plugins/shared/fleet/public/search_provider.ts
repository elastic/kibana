/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, ApplicationStart, IBasePath } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { Observable } from 'rxjs';
import { from, of, combineLatest } from 'rxjs';
import { map, shareReplay, switchMap, take, takeUntil } from 'rxjs';

import type {
  GlobalSearchResultProvider,
  GlobalSearchProviderResult,
} from '@kbn/global-search-plugin/public';

import type { CustomIntegrationsSetup } from '@kbn/custom-integrations-plugin/public';

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { INTEGRATIONS_PLUGIN_ID } from '../common';
import { filterPolicyTemplatesTiles } from '../common/services';

import { sendGetPackages } from './hooks';
import type { GetPackagesResponse, PackageListItem } from './types';
import { pagePathGetters } from './constants';
import { getEuiIconType } from './services/icons';
import {
  AWS_TITLE,
  ONBOARDING_APP_ID,
  ONBOARDING_AWS_PATH,
  ONBOARDING_ENABLED_FLAG,
  getSearchMembers,
  isHiddenByAwsOnboarding,
} from './services/aws_onboarding_override';
import {
  COLLECTION_QUERYPARAM,
  getMatchingCollectionMembers,
  type CollectionMember,
} from './services/collections';
import { ExperimentalFeaturesService } from './services/experimental_features';
import { INTEGRATION_GROUPS } from './applications/integrations/sections/epm/screens/home/integration_groups';

const packageType = 'integration';

const createPackages$ = () =>
  from(sendGetPackages()).pipe(
    map(({ error, data }) => {
      if (error) {
        throw error;
      }
      return data?.items ?? [];
    }),
    shareReplay(1)
  );

/** Exported for testing only @internal */
export const toSearchResult = (
  pkg: PackageListItem,
  application: ApplicationStart,
  basePath: IBasePath
): GlobalSearchProviderResult[] => {
  const packageResult = {
    id: pkg.name,
    type: packageType,
    title: pkg.title,
    score: 80,
    icon: getEuiIconType(pkg, basePath),
    url: {
      path: `${application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}${
        pagePathGetters.integration_details_overview({ pkgkey: pkg.name })[1]
      }`,
      prependBasePath: false,
    },
  };

  const policyTemplateResults = pkg.policy_templates?.map<GlobalSearchProviderResult>(
    (policyTemplate) => ({
      id: policyTemplate.name,
      type: packageType,
      title: policyTemplate.title,
      score: 80,
      icon: getEuiIconType(pkg, basePath, policyTemplate),
      url: {
        path: `${application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}${
          pagePathGetters.integration_details_overview({
            pkgkey: pkg.name,
            integration: policyTemplate.name,
          })[1]
        }`,
        prependBasePath: false,
      },
    })
  );

  const tiles = filterPolicyTemplatesTiles<GlobalSearchProviderResult>(
    pkg.policy_templates_behavior,
    packageResult,
    policyTemplateResults || []
  );
  return [...tiles];
};

interface Collection {
  id: string;
  title: string;
  name: string;
  icon?: string;
  url: string;
  /** The services or packages the collection bundles, one entry per service. */
  members: CollectionMember[];
  /** Everything a search is matched against, on top of the collection title. */
  searchTitles: string[];
}

// Long lists don't fit in the result row, so name the first few and count the rest.
const MAX_NAMED_MEMBERS = 3;

const formatMemberTitles = (titles: string[]): string => {
  const named = titles.slice(0, MAX_NAMED_MEMBERS);
  const hiddenCount = titles.length - named.length;
  const items =
    hiddenCount > 0
      ? [
          ...named,
          i18n.translate('xpack.fleet.searchProvider.collectionMemberMatch.more', {
            defaultMessage: '{count} more',
            values: { count: hiddenCount },
          }),
        ]
      : named;

  return new Intl.ListFormat(i18n.getLocale(), { style: 'long', type: 'conjunction' }).format(
    items
  );
};

const toCollectionResult = (
  collection: Collection,
  term: string | undefined,
  includeAll: boolean
): GlobalSearchProviderResult | undefined => {
  const matches =
    includeAll ||
    (term !== undefined &&
      [collection.title, collection.name, ...collection.searchTitles].some((text) =>
        text.toLowerCase().includes(term)
      ));
  if (!matches) {
    return undefined;
  }

  const matchingMembers = getMatchingCollectionMembers(
    { title: collection.title, name: collection.name },
    collection.members,
    term
  );

  return {
    id: collection.id,
    type: packageType,
    title: collection.title,
    score: 80,
    icon: collection.icon,
    url: { path: collection.url, prependBasePath: false },
    meta: {
      trailingLabel: i18n.translate('xpack.fleet.searchProvider.collectionSize', {
        defaultMessage: 'Collection of {count}',
        values: { count: collection.members.length },
      }),
      ...(matchingMembers.length > 0
        ? {
            description: i18n.translate('xpack.fleet.searchProvider.collectionMemberMatch', {
              defaultMessage:
                '{members} {count, plural, one {is} other {are}} part of the {collection} collection',
              values: {
                members: formatMemberTitles(matchingMembers.map((member) => member.title)),
                count: matchingMembers.length,
                collection: collection.title,
              },
            }),
          }
        : {}),
    },
  };
};

/**
 * The packages covered by the AWS onboarding flow, as one collection. It mirrors the onboarding
 * tile on the integrations page.
 */
const getAwsCollection = (
  hiddenPackages: PackageListItem[],
  application: ApplicationStart
): Collection | undefined => {
  if (hiddenPackages.length === 0) {
    return undefined;
  }

  const candidates = hiddenPackages.flatMap((pkg) => {
    const packageItem = { id: `epr:${pkg.name}`, name: pkg.name, title: pkg.title, type: pkg.type };
    const templateItems = (pkg.policy_templates ?? []).map((policyTemplate) => ({
      id: `epr:${pkg.name}:${policyTemplate.name}`,
      name: pkg.name,
      integration: policyTemplate.name,
      title: policyTemplate.title,
      type: pkg.type,
    }));
    return filterPolicyTemplatesTiles(pkg.policy_templates_behavior, packageItem, templateItems);
  });

  return {
    id: 'aws-onboarding',
    title: AWS_TITLE,
    name: 'aws',
    icon: 'logoAWS',
    url: application.getUrlForApp(ONBOARDING_APP_ID, { path: ONBOARDING_AWS_PATH }),
    members: getSearchMembers(candidates),
    searchTitles: candidates.map((candidate) => candidate.title),
  };
};

/**
 * The packages sharing a manifest `group`, as one collection per group. Like the integrations
 * page, a group needs at least two packages to be a collection.
 */
const getGroupCollections = (
  packages: PackageListItem[],
  application: ApplicationStart,
  basePath: IBasePath
): Collection[] => {
  const byGroup = new Map<string, Map<string, PackageListItem>>();
  for (const pkg of packages) {
    if (pkg.group && INTEGRATION_GROUPS[pkg.group]) {
      const members = byGroup.get(pkg.group) ?? new Map<string, PackageListItem>();
      members.set(pkg.name, pkg);
      byGroup.set(pkg.group, members);
    }
  }

  const browsePath = `${application.getUrlForApp(INTEGRATIONS_PLUGIN_ID)}${
    pagePathGetters.integrations_all({})[1]
  }`;

  return [...byGroup.entries()]
    .filter(([, members]) => members.size >= 2)
    .map(([groupId, members]) => {
      const memberPackages = [...members.values()];
      return {
        id: `collection:${groupId}`,
        title: INTEGRATION_GROUPS[groupId].title,
        name: groupId,
        icon: getEuiIconType(memberPackages[0], basePath),
        url: `${browsePath}?${COLLECTION_QUERYPARAM}=${encodeURIComponent(groupId)}`,
        members: memberPackages.map(({ name, title }) => ({ name, title })),
        // The package titles, plus the titles the packages' own results had so a search for a policy
        // template still finds the collection. `individual_policies` packages have no result of
        // their own, so their title has to be added explicitly.
        searchTitles: memberPackages.flatMap((pkg) => [
          pkg.name,
          pkg.title,
          ...toSearchResult(pkg, application, basePath).map(({ title }) => title),
        ]),
      };
    });
};

export const createPackageSearchProvider = (core: CoreSetup): GlobalSearchResultProvider => {
  const coreStart$ = from(core.getStartServices()).pipe(
    map(([coreStart]) => coreStart),
    shareReplay(1)
  );

  let packages$: undefined | Observable<GetPackagesResponse['items']>;

  const getPackages$ = () => {
    if (!packages$) {
      packages$ = createPackages$();
    }
    return packages$;
  };

  return {
    id: 'integrations',
    getSearchableTypes: () => [packageType],
    find: ({ term, types }, { maxResults, aborted$ }) => {
      if (types?.includes(packageType) === false) {
        return of([]);
      }

      const hasTypes = Boolean(types);
      const typesIncludePackage = hasTypes && types!.includes(packageType);
      const noSearchTerm = !term;
      const includeAllPackages = typesIncludePackage && noSearchTerm;

      if (!includeAllPackages && noSearchTerm) {
        return of([]);
      }

      if (term) {
        term = term.toLowerCase();
      }

      const toSearchResults = (
        coreStart: CoreStart,
        packagesResponse: GetPackagesResponse['items'],
        collapseAws: boolean
      ): GlobalSearchProviderResult[] => {
        const awsPackages = collapseAws
          ? packagesResponse.filter((pkg) => isHiddenByAwsOnboarding(pkg.name))
          : [];
        const remainingPackages = collapseAws
          ? packagesResponse.filter((pkg) => !isHiddenByAwsOnboarding(pkg.name))
          : packagesResponse;

        const collections: Collection[] = [];
        const awsCollection = getAwsCollection(awsPackages, coreStart.application);
        if (awsCollection) {
          collections.push(awsCollection);
        }

        let visiblePackages = remainingPackages;
        if (ExperimentalFeaturesService.get().enableIntegrationCollectionTiles) {
          const groupCollections = getGroupCollections(
            remainingPackages,
            coreStart.application,
            coreStart.http.basePath
          );
          const groupedNames = new Set(
            groupCollections.flatMap((collection) => collection.members.map(({ name }) => name))
          );
          visiblePackages = remainingPackages.filter((pkg) => !groupedNames.has(pkg.name));
          collections.push(...groupCollections);
        }

        const results = [
          ...collections.flatMap(
            (collection) => toCollectionResult(collection, term, includeAllPackages) ?? []
          ),
          ...visiblePackages.flatMap(
            includeAllPackages
              ? (pkg) => toSearchResult(pkg, coreStart.application, coreStart.http.basePath)
              : (pkg) => {
                  if (!term) {
                    return [];
                  }

                  return toSearchResult(pkg, coreStart.application, coreStart.http.basePath).filter(
                    (res) => term && res.title.toLowerCase().includes(term)
                  );
                }
          ),
        ];

        return results.slice(0, maxResults);
      };

      return combineLatest([coreStart$, getPackages$()]).pipe(
        takeUntil(aborted$),
        switchMap(([coreStart, data]) =>
          data
            ? coreStart.featureFlags.getBooleanValue$(ONBOARDING_ENABLED_FLAG, false).pipe(
                take(1),
                map((collapseAws) => toSearchResults(coreStart, data, collapseAws))
              )
            : of([])
        )
      );
    },
  };
};

const toCustomItegrationSearchResult = (customIntegration: CustomIntegration) => ({
  id: customIntegration.id,
  type: packageType,
  title: customIntegration.title,
  score: 80,
  url: customIntegration.uiInternalPath,
  icon: customIntegration.icons.find(({ src }) => Boolean(src))?.src,
});

export const createCustomIntegrationsSearchProvider = (
  customIntegrations: CustomIntegrationsSetup
): GlobalSearchResultProvider => {
  return {
    id: 'customIntegrations',
    getSearchableTypes: () => [packageType],
    find: ({ term, types }, { maxResults, aborted$ }) => {
      if (types?.includes(packageType) === false) {
        return of([]);
      }

      if (!term) {
        return of([]);
      }

      const customIntegrations$ = from(customIntegrations.getReplacementCustomIntegrations()).pipe(
        map((integrations) => integrations),
        shareReplay(1)
      );

      return customIntegrations$.pipe(
        takeUntil(aborted$),
        map((customIntegrationsData) =>
          customIntegrationsData
            .map(toCustomItegrationSearchResult)
            .filter((res) => term && res.title.toLowerCase().includes(term.toLowerCase()))
            .slice(0, maxResults)
        )
      );
    },
  };
};
