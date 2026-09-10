/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  errorMessage: string;
}

export const FetchFailedCallOut: React.FunctionComponent<Props> = (props) => {
  const { errorMessage } = props;
  return (
    <Fragment>
      <KbnDangerCallout
        data-test-subj="fetchFailedCallout"
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.fetchFailedCalloutTitle"
            defaultMessage="Reindex status not available"
          />
        }
        text={errorMessage}
      />
      <EuiSpacer />
    </Fragment>
  );
};
