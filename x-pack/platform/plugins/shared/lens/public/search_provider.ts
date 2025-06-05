/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from '@kbn/core/public';
import { from, of, firstValueFrom } from 'rxjs';
import { AppStatus } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import { getFullPath } from '../common/constants';

/**
 * Checks if the Lens feature should be available in global search.
 * Lens availability depends on the visualize app being accessible.
 */
const isLensSearchAvailable = async (
  capabilities: ApplicationStart['capabilities'],
  applications$: ApplicationStart['applications$']
): Promise<boolean> => {
  // Early exit if visualize capability is disabled
  if (!capabilities.navLinks?.visualize) {
    return false;
  }

  const currentAppsMap = await firstValueFrom(applications$);
  const visualizeApp = currentAppsMap.get('visualize');

  // Exit if visualize app is inaccessible
  if (visualizeApp?.status === AppStatus.inaccessible) {
    return false;
  }

  return true;
};

/**
 * Calculates search relevance score for the given term.
 * Uses the same scoring logic as the default Kibana application search provider.
 */
const calculateSearchScore = (searchableTitle: string, term: string): number => {
  const normalizedTerm = term.toLowerCase();

  if (searchableTitle === normalizedTerm) return 100;
  if (searchableTitle.startsWith(normalizedTerm)) return 90;
  if (searchableTitle.includes(normalizedTerm)) return 75;

  return 0;
};

/**
 * Global search provider adding a Lens entry.
 * This is necessary because Lens does not show up in the nav bar and is filtered out by the
 * default app provider.
 *
 * It is inlining the same search term matching logic as the application search provider.
 *
 * TODO: This is a workaround and can be removed once there is a generic way to register sub features
 * of apps. In this case, Lens should be considered a feature of Visualize.
 */
export const getSearchProvider: (
  applicationPromise: Promise<ApplicationStart>
) => GlobalSearchResultProvider = (applicationPromise) => ({
  id: 'lens',
  find: ({ term = '', types, tags }) => {
    if (tags || (types && !types.includes('application'))) {
      return of([]);
    }

    return from(
      applicationPromise.then(async (application) => {
        const { capabilities, applications$ } = application;

        // Check if Lens should be available in search
        const isAvailable = await isLensSearchAvailable(capabilities, applications$);
        if (!isAvailable) {
          return [];
        }

        const title = i18n.translate('xpack.lens.searchTitle', {
          defaultMessage: 'Lens: create visualizations',
          description: 'Lens is a product name and should not be translated',
        });

        const score = calculateSearchScore(title.toLowerCase(), term);
        if (score === 0) {
          return [];
        }

        return [
          {
            id: 'lens',
            title,
            type: 'application',
            icon: 'logoKibana',
            meta: {
              categoryId: DEFAULT_APP_CATEGORIES.kibana.id,
              categoryLabel: DEFAULT_APP_CATEGORIES.kibana.label,
            },
            score,
            url: getFullPath(),
          },
        ];
      })
    );
  },
  getSearchableTypes: () => ['application'],
});
