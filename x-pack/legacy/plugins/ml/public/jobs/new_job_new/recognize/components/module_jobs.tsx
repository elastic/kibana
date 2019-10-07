/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface ModuleJobsProps {
  jobs: any[];
  jobPrefix: string;
  isSaving: boolean;
}

export const ModuleJobs: FC<ModuleJobsProps> = ({ jobs, jobPrefix, isSaving }) => {
  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage id="xpack.ml.newJob.simple.recognize.jobsTitle" defaultMessage="Jobs" />
        </h4>
      </EuiTitle>

      <EuiListGroup bordered={false} flush={true} wrapText={true} maxWidth={true}>
        {jobs.map(({ id, config: { description }, setupResult, datafeedResult }) => (
          <EuiListGroupItem
            key={id}
            label={
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="secondary">
                        {jobPrefix}
                        {id}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {setupResult && datafeedResult && (
                        <EuiFlexGroup gutterSize="none">
                          <EuiBadge
                            color={setupResult.success ? 'secondary' : 'danger'}
                            iconType={setupResult.success ? 'check' : 'cross'}
                          >
                            <FormattedMessage
                              id="xpack.ml.newJob.simple.recognize.jobLabel"
                              defaultMessage="Job"
                            />
                          </EuiBadge>
                          <EuiBadge
                            color={datafeedResult.success ? 'secondary' : 'danger'}
                            iconType={datafeedResult.success ? 'check' : 'cross'}
                          >
                            <FormattedMessage
                              id="xpack.ml.newJob.simple.recognize.datafeedLabel"
                              defaultMessage="Datafeed"
                            />
                          </EuiBadge>
                          <EuiBadge
                            color={datafeedResult.started ? 'secondary' : 'danger'}
                            iconType={datafeedResult.started ? 'check' : 'cross'}
                          >
                            <FormattedMessage
                              id="xpack.ml.newJob.simple.recognize.runningLabel"
                              defaultMessage="Running"
                            />
                          </EuiBadge>
                        </EuiFlexGroup>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiText size="s" color="subdued">
                    {description}
                  </EuiText>

                  {setupResult && setupResult.error && (
                    <EuiText size="xs" color="danger">
                      {setupResult.error.msg}
                    </EuiText>
                  )}
                </EuiFlexItem>
                <EuiFlexItem>{isSaving && <EuiLoadingSpinner size="m" />}</EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        ))}
      </EuiListGroup>
    </>
  );
};
