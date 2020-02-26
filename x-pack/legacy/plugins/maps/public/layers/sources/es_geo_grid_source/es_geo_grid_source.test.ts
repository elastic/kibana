/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('../../../kibana_services', () => {});
jest.mock('ui/new_platform');

import { ESGeoGridSource } from './es_geo_grid_source';
import { ES_GEO_GRID } from '../../../../common/constants';
import { IField } from '../../fields/field';

describe('ESGeoGridSource', () => {
  it('metrics and fields should match', async () => {
    const metricExamples = [
      {
        type: 'sum',
        field: 'myFieldGettingSummed',
        label: 'my custom label',
      },
      {
        // metric config is invalid beause field is missing
        type: 'max',
      },
      {
        // metric config is valid because "count" metric does not need to provide field
        type: 'count',
        label: '', // should ignore empty label fields
      },
    ];

    const geogridSource = new ESGeoGridSource(
      {
        id: 'foobar',
        indexPatternId: 'fooIp',
        geoField: 'bar',
        metrics: metricExamples,
        resolution: 'coarse',
        type: ES_GEO_GRID,
        requestType: 'heatmap',
      },
      {}
    );

    const fields = await geogridSource.getFields();
    const metrics = await geogridSource.getMetricFields();

    const getFieldMeta = async (field: IField) => {
      return {
        field: field.getName(),
        label: await field.getLabel(),
        type: await field.getDataType(),
      };
    };

    const fm = await Promise.all(fields.map(getFieldMeta));
    const mm = await Promise.all(metrics.map(getFieldMeta));

    expect(_.isEqual(fm, mm)).toEqual(true);

    expect(
      _.isEqual(fm, [
        {
          type: 'number',
          field: 'sum_of_myFieldGettingSummed',
          label: 'my custom label',
        },
        {
          type: 'number',
          label: 'count',
          field: 'doc_count',
        },
      ])
    ).toEqual(true);
  });
});
