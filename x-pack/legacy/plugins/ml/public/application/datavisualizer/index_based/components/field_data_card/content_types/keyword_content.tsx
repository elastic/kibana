/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';
import { TopValues } from '../top_values';

export const KeywordContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats, fieldFormat } = config;

  const { count, sampleCount, cardinality } = stats;
  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <div className="mlFieldDataCard__stats">
      <div>
        <EuiText size="xs" color="subdued">
          <EuiIcon type="document" />
          &nbsp;
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardKeyword.documentsCountDescription"
            defaultMessage="{count, plural, zero {# document} one {# document} other {# documents}} ({docsPercent}%)"
            values={{
              count,
              docsPercent,
            }}
          />
        </EuiText>
      </div>

      <EuiSpacer size="xs" />

      <div>
        <EuiText size="xs" color="subdued">
          <EuiIcon type="database" />
          &nbsp;
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardKeyword.distinctCountDescription"
            defaultMessage="{cardinality} distinct {cardinality, plural, zero {value} one {value} other {values}}"
            values={{
              cardinality,
            }}
          />
        </EuiText>
      </div>

      <EuiSpacer size="m" />

      <div>
        <EuiText size="s">
          <h6>
            <FormattedMessage
              id="xpack.ml.fieldDataCard.cardKeyword.topValuesLabel"
              defaultMessage="Top values"
            />
          </h6>
        </EuiText>

        <EuiSpacer size="s" />
        <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
      </div>
    </div>
  );
};
