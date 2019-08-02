/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { mlNodesAvailable, permissionToViewMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';

import React from 'react';

import {
  EuiCallOut,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function NodeAvailableWarning() {
  const isCloud = false; // placeholder for future specific cloud functionality
  if ((mlNodesAvailable() === true) || (permissionToViewMlNodeCount() === false)) {
    return (<span />);
  } else {
    return (
      <React.Fragment>
        <EuiCallOut
          title={(<FormattedMessage
            id="xpack.ml.jobsList.nodeAvailableWarning.noMLNodesAvailableTitle"
            defaultMessage="No ML nodes available"
          />)}
          color="warning"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.ml.jobsList.nodeAvailableWarning.noMLNodesAvailableDescription"
              defaultMessage="There are no ML nodes available."
            /><br />
            <FormattedMessage
              id="xpack.ml.jobsList.nodeAvailableWarning.unavailableCreateOrRunJobsDescription"
              defaultMessage="You will not be able to create or run jobs. {cloudConfigLink}"
              values={{
                cloudConfigLink: isCloud
                  ? <FormattedMessage
                    id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloudDescription"
                    defaultMessage="This can be configured in Cloud {hereCloudLink}."
                    values={{
                      hereCloudLink: (
                        <EuiLink href="#">
                          <FormattedMessage
                            id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloud.hereLinkText"
                            defaultMessage="here"
                          />
                        </EuiLink>
                      )
                    }}
                  />
                  : '',
              }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </React.Fragment>
    );
  }
}
