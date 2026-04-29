/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PERMISSION_DENIED } from '../../shared_components/osquery_action/translations';

const EmptyPromptComponent = () => (
  <EuiEmptyPrompt
    iconType="logoOsquery"
    title={<h2>{PERMISSION_DENIED}</h2>}
    titleSize="xs"
    body={
      <FormattedMessage
        id="xpack.osquery.results.permissionDenied"
        defaultMessage="To access these results, ask your administrator for {osquery} Kibana
              privileges."
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        values={{
          osquery: <EuiCode>osquery</EuiCode>,
        }}
      />
    }
  />
);

export const EmptyPrompt = React.memo(EmptyPromptComponent);
