/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiCallOut,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export function ConfiguredByNodeWarning() {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.remoteClusters.configuredByNodeWarningTitle"
          defaultMessage="You can't edit or delete this remote cluster because it's defined in a node's
            elasticsearch.yml configuration file."
        />
      }
      color="primary"
      iconType="iInCircle"
      data-test-subj="remoteClusterConfiguredByNodeWarning"
    />
  );
}
