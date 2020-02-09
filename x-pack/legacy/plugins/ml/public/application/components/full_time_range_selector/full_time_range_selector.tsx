/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { Query } from 'src/plugins/data/public';
import { EuiButton } from '@elastic/eui';
import { setFullTimeRange } from './full_time_range_selector_service';
import { IndexPattern } from '../../../../../../../../src/plugins/data/public';

interface Props {
  indexPattern: IndexPattern;
  query: Query;
  disabled: boolean;
  callback?: (a: any) => void;
}

// Component for rendering a button which automatically sets the range of the time filter
// to the time range of data in the index(es) mapped to the supplied Kibana index pattern or query.
export const FullTimeRangeSelector: FC<Props> = ({ indexPattern, query, disabled, callback }) => {
  // wrapper around setFullTimeRange to allow for the calling of the optional callBack prop
  async function setRange(i: IndexPattern, q: Query) {
    const fullTimeRange = await setFullTimeRange(i, q);
    if (typeof callback === 'function') {
      callback(fullTimeRange);
    }
  }
  return (
    <EuiButton
      isDisabled={disabled}
      onClick={() => setRange(indexPattern, query)}
      data-test-subj="mlButtonUseFullData"
    >
      <FormattedMessage
        id="xpack.ml.fullTimeRangeSelector.useFullDataButtonLabel"
        defaultMessage="Use full {indexPatternTitle} data"
        values={{
          indexPatternTitle: indexPattern.title,
        }}
      />
    </EuiButton>
  );
};
