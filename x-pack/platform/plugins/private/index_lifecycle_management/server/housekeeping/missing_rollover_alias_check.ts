/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HousekeepingCheck, HousekeepingCheckFinding } from '@kbn/housekeeping-plugin/server';

const ROLLOVER_ALIAS = 'index.lifecycle.rollover_alias';

export const missingRolloverAliasCheck: HousekeepingCheck = {
  id: 'ilm.missing_rollover_alias',
  kind: 'broken_reference',
  title: i18n.translate('xpack.indexLifecycleMgmt.housekeeping.rolloverAlias.title', {
    defaultMessage: 'Missing rollover alias',
  }),
  description: i18n.translate('xpack.indexLifecycleMgmt.housekeeping.rolloverAlias.description', {
    defaultMessage:
      'ILM rolls these indices over through the alias in {setting}, but the alias does not point to them, so the rollover step fails. Add the alias to the index, or move the data to a data stream.',
    values: { setting: ROLLOVER_ALIAS },
  }),
  resourceTypes: ['index'],
  isAvailable: ({ isServerless }) => !isServerless,

  async run({ esClient, abortSignal }) {
    const options = { signal: abortSignal };
    const [settings, aliases] = await Promise.all([
      esClient.indices.getSettings(
        {
          index: '*',
          name: ROLLOVER_ALIAS,
          flat_settings: true,
          expand_wildcards: ['open', 'hidden'],
        },
        options
      ),
      // ES returns 404 when there are no aliases
      esClient.indices.getAlias(
        { index: '*', expand_wildcards: ['open', 'hidden'] },
        { ...options, ignore: [404] }
      ),
    ]);

    return Object.entries(settings).flatMap(
      ([index, { settings: values }]): HousekeepingCheckFinding[] => {
        const alias = values?.[ROLLOVER_ALIAS];
        if (typeof alias !== 'string' || alias === '' || aliases[index]?.aliases?.[alias]) {
          return [];
        }
        return [
          {
            resource: { type: 'index', id: index, isManaged: index.startsWith('.') },
            related: [{ type: 'index_alias', id: alias }],
            details: [
              i18n.translate('xpack.indexLifecycleMgmt.housekeeping.rolloverAlias.detail', {
                defaultMessage: '{setting} points to {alias}, which is not an alias of this index.',
                values: { setting: ROLLOVER_ALIAS, alias },
              }),
            ],
          },
        ];
      }
    );
  },
};
