/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import { Server } from 'hapi';
import { Projection } from '../../../../public/projections/typings';
import { UIFilters } from '../../../../typings/ui-filters';
import { getUiFiltersES } from '../../helpers/convert_ui_filters/get_ui_filters_es';
import { localUIFilters, LocalUIFilterName, TERM_COUNT_LIMIT } from './config';

export const getFilterAggregations = async ({
  server,
  uiFilters,
  projection,
  localFilterNames
}: {
  server: Server;
  uiFilters: UIFilters;
  projection: Projection;
  localFilterNames: LocalUIFilterName[];
}) => {
  const mappedFilters = localFilterNames.map(name => localUIFilters[name]);

  const nestedAggregationKey = projection.body.aggs
    ? Object.keys(projection.body.aggs)[0]
    : '';

  const aggs = await Promise.all(
    mappedFilters.map(async field => {
      const filter = await getUiFiltersES(server, omit(uiFilters, field.name));

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
                  _count: 'desc'
                }
              },
              ...(projection.body.aggs &&
              nestedAggregationKey in projection.body.aggs
                ? {
                    aggs: {
                      count: {
                        terms: {
                          ...projection.body.aggs[nestedAggregationKey].terms,
                          order: {
                            _count: 'desc'
                          },
                          size: TERM_COUNT_LIMIT
                        }
                      }
                    }
                  }
                : {})
            }
          }
        }
      };
    })
  );

  const mergedAggregations = Object.assign({}, ...aggs) as Partial<
    Record<LocalUIFilterName, typeof aggs[0]['']>
  >;

  return mergedAggregations;
};
