/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18nLoader } from '@kbn/i18n';
import { size } from 'lodash';
import { getIntegrityHashes, Integrities } from './file_integrity';
import { KIBANA_LOCALIZATION_STATS_TYPE } from '../../../common/constants';
export interface UsageStats {
  locale: string;
  integrities: Integrities;
  labelsCount?: number;
}

export async function getTranslationCount(loader: any, locale: string): Promise<number> {
  const translations = await loader.getTranslationsByLocale(locale);
  return size(translations.messages);
}

export function createCollectorFetch(server: any) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const config = server.config();
    const locale: string = config.get('i18n.locale');
    const translationFilePaths: string[] = server.getTranslationsFilePaths();

    const [labelsCount, integrities] = await Promise.all([
      getTranslationCount(i18nLoader, locale),
      getIntegrityHashes(translationFilePaths),
    ]);

    return {
      locale,
      integrities,
      labelsCount,
    };
  };
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function createLocalizationUsageCollector(server: any) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_LOCALIZATION_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(server),
  });
}
