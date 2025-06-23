/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext, RegisterDeprecationsConfig } from '@kbn/core-deprecations-server';

import { i18n } from '@kbn/i18n';
import { getPreEightEnterpriseSearchIndices } from './pre_eight_index_deprecator';

export const getEntepriseSearchRegisteredDeprecations = (
  docsUrl: string
): RegisterDeprecationsConfig => {
  return {
    getDeprecations: async (ctx: GetDeprecationsContext) => {
      const [entSearchIndexIncompatibility] = await Promise.all([
        getEnterpriseSearchPre8IndexDeprecations(ctx, docsUrl),
      ]);
      return [...entSearchIndexIncompatibility];
    },
  };
};

/**
 * If there are any Enterprise Search indices that were created with Elasticsearch 7.x, they must be removed
 * or set to read-only
 */
export async function getEnterpriseSearchPre8IndexDeprecations(
  ctx: GetDeprecationsContext,
  docsUrl: string
): Promise<DeprecationsDetails[]> {
  const deprecations: DeprecationsDetails[] = [];

  const entSearchIndices = await getPreEightEnterpriseSearchIndices(ctx.esClient.asInternalUser);
  if (!entSearchIndices || entSearchIndices.length === 0) {
    return deprecations;
  }

  let indicesList = '';
  let datastreamsList = '';
  for (const index of entSearchIndices) {
    if (index.hasDatastream) {
      indicesList += `${index.name}\n`;
      for (const datastream of index.datastreams) {
        if (datastream === '') continue;
        datastreamsList += `${datastream}\n`;
      }
    } else {
      indicesList += `${index.name}\n`;
    }
  }

  let message = `There are ${entSearchIndices.length} incompatible Enterprise Search indices.\n\n`;

  if (indicesList.length > 0) {
    message +=
      'The following indices are found to be incompatible for upgrade:\n\n' +
      '```\n' +
      `${indicesList}` +
      '\n```\n' +
      'These indices must be either set to read-only or deleted before upgrading.\n';
  }

  if (datastreamsList.length > 0) {
    message +=
      '\nThe following data streams are found to be incompatible for upgrade:\n\n' +
      '```\n' +
      `${datastreamsList}` +
      '\n```\n' +
      'Using the "quick resolve" button below will roll over any datastreams and set all incompatible indices to read-only.\n\n' +
      'Alternatively, manually deleting these indices and data streams will also unblock your upgrade.';
  } else {
    message +=
      'Setting these indices to read-only can be attempted with the "quick resolve" button below.\n\n' +
      'Alternatively, manually deleting these indices will also unblock your upgrade.';
  }

  deprecations.push({
    level: 'critical',
    deprecationType: 'feature',
    title: i18n.translate(
      'xpack.upgradeAssistant.deprecations.incompatibleEnterpriseSearchIndexes.title',
      {
        defaultMessage: 'Pre 8.x Enterprise Search indices compatibility',
      }
    ),
    message: {
      type: 'markdown',
      content: i18n.translate(
        'xpack.upgradeAssistant.deprecations.incompatibleEnterpriseSearchIndexes.message',
        {
          defaultMessage: message,
        }
      ),
    },
    documentationUrl: docsUrl,
    correctiveActions: {
      manualSteps: [
        i18n.translate(
          'xpack.upgradeAssistant.deprecations.incompatibleEnterpriseSearchIndexes.deleteIndices',
          {
            defaultMessage: 'Set all incompatible indices and data streams to read-only, or',
          }
        ),
        i18n.translate(
          'xpack.upgradeAssistant.deprecations.incompatibleEnterpriseSearchIndexes.deleteIndices',
          {
            defaultMessage: 'Delete all incompatible indices and data streams',
          }
        ),
      ],
      api: {
        method: 'POST',
        path: '/internal/enterprise_search/deprecations/set_enterprise_search_indices_read_only',
        body: {
          deprecationDetails: { domainId: 'enterpriseSearch' },
        },
      },
    },
  });

  return deprecations;
}
