/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiIcon, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
// @ts-ignore
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';
import { ExamplesList } from '../examples_list';

export const GeoPointContent: FC<FieldDataCardProps> = ({ config }) => {
  // TODO - adjust server-side query to get examples using:

  // GET /filebeat-apache-2019.01.30/_search
  // {
  //   "size":10,
  //   "_source": false,
  //   "docvalue_fields": ["source.geo.location"],
  //    "query": {
  //        "bool":{
  //          "must":[
  //             {
  //                "exists":{
  //                   "field":"source.geo.location"
  //                }
  //             }
  //          ]
  //       }
  //    }
  // }

  const { stats } = config;
  if (stats === undefined) {
    return null;
  }

  const { count, sampleCount, cardinality, examples } = stats;
  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <div className="mlFieldDataCard__stats">
      <div>
        <EuiIcon type="document" />
        &nbsp;
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardGeoPoint.documentsCountDescription"
          defaultMessage="{count, plural, zero {# document} one {# document} other {# documents}} ({docsPercent}%)"
          values={{
            count,
            docsPercent,
          }}
        />
      </div>

      <EuiSpacer size="xs" />

      <div>
        <EuiIcon type="database" />
        &nbsp;
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardGeoPoint.distinctCountDescription"
          defaultMessage="{cardinality} distinct {cardinality, plural, zero {value} one {value} other {values}}"
          values={{
            cardinality,
          }}
        />
      </div>

      <EuiSpacer size="s" />

      <ExamplesList examples={examples} />
    </div>
  );
};
