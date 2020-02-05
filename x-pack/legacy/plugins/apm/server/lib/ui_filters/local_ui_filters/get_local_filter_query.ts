/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { IIndexPattern } from 'src/plugins/data/server';
import { mergeProjection } from '../../../../common/projections/util/merge_projection';
import { Projection } from '../../../../common/projections/typings';
import { UIFilters } from '../../../../typings/ui-filters';
import { getUiFiltersES } from '../../helpers/convert_ui_filters/get_ui_filters_es';
import { localUIFilters, LocalUIFilterName } from './config';

export const getLocalFilterQuery = ({
  indexPattern,
  uiFilters,
  projection,
  localUIFilterName
}: {
  indexPattern: IIndexPattern | undefined;
  uiFilters: UIFilters;
  projection: Projection;
  localUIFilterName: LocalUIFilterName;
}) => {
  const field = localUIFilters[localUIFilterName];
  const filter = getUiFiltersES(indexPattern, omit(uiFilters, field.name));

  const bucketCountAggregation = projection.body.aggs
    ? {
        aggs: {
          bucket_count: {
            cardinality: {
              field:
                projection.body.aggs[Object.keys(projection.body.aggs)[0]].terms
                  .field
            }
          }
        }
      }
    : {};

  return mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: filter.concat(projection.body.query?.bool?.filter || [])
        }
      },
      aggs: {
        by_terms: {
          terms: {
            field: field.fieldName,
            order: {
              _count: 'desc'
            }
          },
          ...bucketCountAggregation
        }
      }
    }
  });
};
