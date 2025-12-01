/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { i18n } from '@kbn/i18n';
import type { DocLinksServiceSetup } from '@kbn/core/server';

export const getLegacyRbacDeprecationsInfo = async (
  { esClient }: GetDeprecationsContext,
  docLinks: DocLinksServiceSetup
): Promise<DeprecationsDetails[]> => {
  const { hits: legacyRBACExemptions } = await esClient.asCurrentUser.search({
    index: '.kibana,.kibana_alerting_cases',
    body: {
      runtime_mappings: {
        apiKeyVersion: {
          type: 'keyword',
          script: {
            source:
              "def alert = params._source['alert']; if (alert != null) { def meta = alert.meta; if (meta != null) { emit(meta.versionApiKeyLastmodified); } else { emit('');}}",
          },
        },
      },
      size: 10000,
      query: {
        bool: {
          filter: [
            {
              term: {
                type: 'alert',
              },
            },
            {
              term: {
                apiKeyVersion: 'pre-7.10.0',
              },
            },
          ],
        },
      },
      _source: ['alert.name', 'namespaces'],
    },
  });

  if (legacyRBACExemptions.hits.length) {
    return [
      {
        title: i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.title', {
          defaultMessage: 'Legacy RBAC exemption',
        }),
        level: 'warning',
        deprecationType: 'feature',
        message: i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.message', {
          defaultMessage:
            'The legacy role-based action control exemption for alerting rules has been removed in future versions. This cluster has alerting rules triggering actions that rely on the legacy exemption. The rules will fail to trigger actions for alerts.',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.manualStepOne', {
              defaultMessage:
                'To identify the affected rules run the query in Dev Tools that is linked under Learn more.',
            }),
            i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.manualStepTwo', {
              defaultMessage:
                'To use normal RBAC authorization, update the API key by editing the rule.',
            }),
          ],
        },
        documentationUrl: docLinks.links.alerting.legacyRbacExemption,
      },
    ];
  }
  return [];
};
