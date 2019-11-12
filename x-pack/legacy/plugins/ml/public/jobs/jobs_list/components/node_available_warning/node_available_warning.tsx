/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { mlNodesAvailable, permissionToViewMlNodeCount } from '../../../../ml_nodes_check';
import { cloudDeploymentId, isCloud } from '../../../../jobs/new_job_new/utils/new_job_defaults';

export const NodeAvailableWarning: FC = () => {
  if (mlNodesAvailable() === true || permissionToViewMlNodeCount() === false) {
    return null;
  } else {
    const id = cloudDeploymentId();
    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ml.jobsList.nodeAvailableWarning.noMLNodesAvailableTitle"
              defaultMessage="No ML nodes available"
            />
          }
          color="warning"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.ml.jobsList.nodeAvailableWarning.noMLNodesAvailableDescription"
              defaultMessage="There are no ML nodes available."
            />
            <br />
            <FormattedMessage
              id="xpack.ml.jobsList.nodeAvailableWarning.unavailableCreateOrRunJobsDescription"
              defaultMessage="You will not be able to create or run jobs."
            />
            {isCloud && id !== null && (
              <Fragment>
                <br />
                <FormattedMessage
                  id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloudDescription"
                  defaultMessage="Please edit your {link}. You may enable a free 1GB machine learning node or expand your existing ML configuration."
                  values={{
                    link: (
                      <EuiLink href={`https://cloud.elastic.co/deployments?q=${id}`}>
                        <FormattedMessage
                          id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloud.hereLinkText"
                          defaultMessage="Elastic Cloud deployment"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </Fragment>
            )}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }
};
