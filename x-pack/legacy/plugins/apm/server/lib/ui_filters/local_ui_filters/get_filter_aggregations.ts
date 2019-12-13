/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { IIndexPattern } from 'src/plugins/data/server';
import { Projection } from '../../../../common/projections/typings';
import { UIFilters } from '../../../../typings/ui-filters';
import { getUiFiltersES } from '../../helpers/convert_ui_filters/get_ui_filters_es';
import { localUIFilters, LocalUIFilterName } from './config';

export const getFilterAggregations = ({
  indexPattern,
  uiFilters,
  projection,
  localFilterNames
}: {
  indexPattern: IIndexPattern | undefined;
  uiFilters: UIFilters;
  projection: Projection;
  localFilterNames: LocalUIFilterName[];
}) => {
  const mappedFilters = localFilterNames.map(name => localUIFilters[name]);

  const aggs = mappedFilters.map(field => {
    const filter = getUiFiltersES(indexPattern, omit(uiFilters, field.name));

    const bucketCountAggregation = projection.body.aggs
      ? {
          aggs: {
            bucket_count: {
              cardinality: {
                field:
                  projection.body.aggs[Object.keys(projection.body.aggs)[0]]
                    .terms.field
              }
            }
          }
        }
      : {};

    return {
      [field.name]: {
        filter: {
          bool: {
            filter
          }
        },
        aggs: {
          by_terms: {
            terms: {
              field: field.fieldName,
              order: {
                _count: 'desc' as const
              }
            },
            ...bucketCountAggregation
          }
        }
      }
    };
  });

  const mergedAggregations = Object.assign({}, ...aggs) as Partial<
    Record<LocalUIFilterName, typeof aggs[0]['']>
  >;

  return mergedAggregations;
};
