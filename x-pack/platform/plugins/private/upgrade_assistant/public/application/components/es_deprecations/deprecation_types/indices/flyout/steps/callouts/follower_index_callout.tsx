/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const FollowerIndexCallout: React.FunctionComponent = () => {
  return (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.followerIndexTitle"
            defaultMessage="Termination of replication is recommended"
          />
        }
        color="primary"
        iconType="info"
        data-test-subj="followerIndexCallout"
      >
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.followerIndexText"
            defaultMessage="This index is a cross-cluster replication follower index, which should not be reindexed. You can set it to read-only or terminate the replication and convert it to a standard index."
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
};
