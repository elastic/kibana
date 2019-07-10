/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { Query } from 'ui/embeddable';
import { IndexPattern } from 'ui/index_patterns';
import { EuiButton } from '@elastic/eui';
import { setFullTimeRange } from './full_time_range_selector_service';

interface Props {
  indexPattern: IndexPattern;
  query: Query;
  disabled: boolean;
}

// Component for rendering a button which automatically sets the range of the time filter
// to the time range of data in the index(es) mapped to the supplied Kibana index pattern or query.
export const FullTimeRangeSelector: React.SFC<Props> = ({ indexPattern, query, disabled }) => {
  return (
    <EuiButton fill isDisabled={disabled} onClick={() => setFullTimeRange(indexPattern, query)}>
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
