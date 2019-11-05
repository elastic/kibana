/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { useEffect, useState, FC } from 'react';
import { BehaviorSubject } from 'rxjs';

import { getSpecId, BarSeries, Chart, Settings } from '@elastic/charts';
import { EuiText } from '@elastic/eui';

import { StaticIndexPattern } from 'ui/index_patterns';

// TODO: Below import is temporary, use `react-use` lib instead.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useObservable } from '../../../../../../../../../../src/plugins/kibana_react/public/util/use_observable';
import { KBN_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';

import { EsDoc, PivotQuery } from '../../../../common';
import { useApi } from '../../../../hooks/use_api';
import { ColumnType } from '../../../../../shared_imports';

export const hoveredRow$ = new BehaviorSubject<EsDoc | null>(null);

interface Props {
  indexPattern: StaticIndexPattern;
  columnType: ColumnType;
  query: PivotQuery;
}

interface DataItem {
  x: string | number;
  y: number;
}

const MAX_CHART_COLUMNS = 20;

export const ColumnChart: FC<Props> = ({ indexPattern, columnType, query }) => {
  const [cardinality, setCardinality] = useState(0);
  const [data, setData] = useState<DataItem[]>([]);
  const [interval, setInterval] = useState(0);
  const [stats, setStats] = useState([0, 0]);

  const api = useApi();

  const hoveredRow = useObservable(hoveredRow$);

  const field = indexPattern.fields.find(f => f.name === columnType.name);

  const fetchCardinality = async () => {
    try {
      const resp: any = await api.esSearch({
        index: indexPattern.title,
        size: 0,
        body: {
          query,
          aggs: {
            categories: {
              cardinality: {
                field: field.name,
              },
            },
          },
          size: 0,
        },
      });
      setCardinality(resp.aggregations.categories.value);
    } catch (e) {
      throw new Error(e);
    }
  };

  const fetchChartHistogramData = async () => {
    try {
      const respStats: any = await api.esSearch({
        index: indexPattern.title,
        size: 0,
        body: {
          query,
          aggs: {
            min_max: {
              stats: {
                field: field.name,
              },
            },
          },
          size: 0,
        },
      });

      setStats([respStats.aggregations.min_max.min, respStats.aggregations.min_max.max]);

      const delta = respStats.aggregations.min_max.max - respStats.aggregations.min_max.min;

      let aggInterval = 1;

      if (delta > MAX_CHART_COLUMNS) {
        aggInterval = Math.round(delta / MAX_CHART_COLUMNS);
      }

      if (delta <= 1) {
        aggInterval = delta / MAX_CHART_COLUMNS;
      }
      setInterval(aggInterval);

      const resp: any = await api.esSearch({
        index: indexPattern.title,
        size: 0,
        body: {
          query,
          aggs: {
            chart: {
              histogram: {
                field: field.name,
                interval: aggInterval,
              },
            },
          },
          size: 0,
        },
      });

      setData(resp.aggregations.chart.buckets);
    } catch (e) {
      throw new Error(e);
    }
  };
  const fetchChartTermsData = async () => {
    try {
      const resp: any = await api.esSearch({
        index: indexPattern.title,
        size: 0,
        body: {
          query,
          aggs: {
            chart: {
              terms: {
                field: field.name,
                size: MAX_CHART_COLUMNS,
              },
            },
          },
          size: 0,
        },
      });
      setData(resp.aggregations.chart.buckets);
    } catch (e) {
      throw new Error(e);
    }
  };

  useEffect(() => {
    if (field.type === KBN_FIELD_TYPES.NUMBER || field.type === KBN_FIELD_TYPES.DATE) {
      fetchChartHistogramData();
    }
    if (field.type === KBN_FIELD_TYPES.STRING || field.type === KBN_FIELD_TYPES.IP) {
      fetchCardinality();
      fetchChartTermsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.type, JSON.stringify(query)]);

  if (data.length === 0) {
    return null;
  }

  function getXScaleType(fieldType: KBN_FIELD_TYPES) {
    switch (fieldType) {
      case KBN_FIELD_TYPES.STRING:
      case KBN_FIELD_TYPES.IP:
        return 'ordinal';
      case KBN_FIELD_TYPES.DATE:
        return 'time';
      case KBN_FIELD_TYPES.NUMBER:
        return 'linear';
    }
  }

  const xScaleType = getXScaleType(field.type);

  const getColor = d => {
    if (hoveredRow === undefined || hoveredRow === null) {
      return '#5782ae';
    }

    if (xScaleType === 'ordinal' && hoveredRow._source[field.name] === d.key) {
      return '#5782ae';
    }

    if (
      xScaleType === 'linear' &&
      hoveredRow._source[field.name] >= +d.key &&
      hoveredRow._source[field.name] < +d.key + interval
    ) {
      return '#5782ae';
    }

    if (
      xScaleType === 'time' &&
      moment(hoveredRow._source[field.name]).unix() * 1000 >= +d.key &&
      moment(hoveredRow._source[field.name]).unix() * 1000 < +d.key + interval
    ) {
      return '#5782ae';
    }

    return '#d4dae5';
  };

  const coloredData = data.map(d => ({ ...d, color: getColor(d) }));

  return (
    <>
      <div style={{ width: '100%', height: '75px' }}>
        <Chart className="story-chart">
          <Settings
            theme={{
              chartMargins: {
                left: 3,
                right: 3,
                top: 5,
                bottom: 1,
              },
              chartPaddings: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              },
              scales: { barsPadding: 0.1 },
            }}
          />
          <BarSeries
            id={getSpecId('source_index')}
            name="count"
            xScaleType={xScaleType}
            yScaleType="linear"
            xAccessor="key"
            yAccessors={['doc_count']}
            styleAccessor={d => d.datum.color}
            data={coloredData}
          />
        </Chart>
      </div>
      <div
        style={{
          display: 'block',
          overflow: 'hidden',
        }}
      >
        <EuiText
          size="xs"
          color="subdued"
          style={{
            marginLeft: '3px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <i>
            {(field.type === KBN_FIELD_TYPES.STRING || field.type === KBN_FIELD_TYPES.IP) &&
              cardinality === 1 &&
              `${cardinality} category`}
            {(field.type === KBN_FIELD_TYPES.STRING || field.type === KBN_FIELD_TYPES.IP) &&
              cardinality > MAX_CHART_COLUMNS &&
              `top ${MAX_CHART_COLUMNS} of ${cardinality} categories`}
            {(field.type === KBN_FIELD_TYPES.STRING || field.type === KBN_FIELD_TYPES.IP) &&
              cardinality <= MAX_CHART_COLUMNS &&
              cardinality > 1 &&
              `${cardinality} categories`}
            {(field.type === KBN_FIELD_TYPES.NUMBER || field.type === KBN_FIELD_TYPES.DATE) &&
              `${Math.round(stats[0] * 100) / 100} - ${Math.round(stats[1] * 100) / 100}`}
          </i>
        </EuiText>
      </div>
    </>
  );
};
