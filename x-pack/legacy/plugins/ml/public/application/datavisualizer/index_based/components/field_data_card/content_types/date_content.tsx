/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiIcon, EuiSpacer } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';

const TIME_FORMAT = 'MMM D YYYY, HH:mm:ss.SSS';

export const DateContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;

  const { count, sampleCount, earliest, latest } = stats;
  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <div className="mlFieldDataCard__stats">
      <div>
        <EuiIcon type="document" />
        &nbsp;
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardDate.documentsCountDescription"
          defaultMessage="{count, plural, zero {# document} one {# document} other {# documents}} ({docsPercent}%)"
          values={{
            count,
            docsPercent,
          }}
        />
      </div>

      <EuiSpacer size="s" />

      <div>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardDate.earliestDescription"
          defaultMessage="earliest {earliestFormatted}"
          values={{
            earliestFormatted: formatDate(earliest, TIME_FORMAT),
          }}
        />
      </div>

      <EuiSpacer size="s" />

      <div>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardDate.latestDescription"
          defaultMessage="latest {latestFormatted}"
          values={{
            latestFormatted: formatDate(latest, TIME_FORMAT),
          }}
        />
      </div>
    </div>
  );
};
