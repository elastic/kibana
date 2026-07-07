/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import type { DataViewSpec } from '@kbn/data-plugin/common';
import type { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import type { StoredMapAttributes } from '../../server';

export function migrateDataViewsPersistedState(
  {
    attributes,
  }: {
    attributes: StoredMapAttributes;
  },
  migration: MigrateFunction<Serializable, Serializable>
): StoredMapAttributes {
  let mapState: { adHocDataViews?: DataViewSpec[] } = { adHocDataViews: [] };
  if (attributes.mapStateJSON) {
    try {
      mapState = JSON.parse(attributes.mapStateJSON);
    } catch (e) {
      throw new Error('Unable to parse attribute mapStateJSON');
    }

    if (mapState.adHocDataViews && mapState.adHocDataViews.length > 0) {
      mapState.adHocDataViews = mapState.adHocDataViews.map((spec) => {
        return migration(spec) as unknown as DataViewSpec;
      });
    }
  }

  return {
    ...attributes,
    mapStateJSON: JSON.stringify(mapState),
  };
}
