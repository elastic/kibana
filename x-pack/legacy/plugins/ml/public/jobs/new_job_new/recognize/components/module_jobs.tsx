/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { ModuleJobUI } from '../page';

interface ModuleJobsProps {
  jobs: ModuleJobUI[];
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

      <ul>
        {jobs.map(({ id, config: { description }, setupResult, datafeedResult }) => (
          <li key={id}>
            <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s" color="secondary">
                  {jobPrefix}
                  {id}
                </EuiText>

                <EuiText size="s" color="subdued">
                  {description}
                </EuiText>

                {setupResult && setupResult.error && (
                  <EuiText size="xs" color="danger">
                    {setupResult.error.msg}
                  </EuiText>
                )}

                {datafeedResult && datafeedResult.error && (
                  <EuiText size="xs" color="danger">
                    {datafeedResult.error.msg}
                  </EuiText>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: '200px' }}>
                {isSaving && <EuiLoadingSpinner size="m" />}
                {setupResult && datafeedResult && (
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <EuiText
                        color={setupResult.success ? 'secondary' : 'danger'}
                        size="xs"
                        className="eui-textNoWrap"
                        textAlign="center"
                      >
                        <EuiIcon
                          type={setupResult.success ? 'check' : 'cross'}
                          color={setupResult.success ? 'secondary' : 'danger'}
                          size="s"
                          aria-label={
                            setupResult.success
                              ? i18n.translate(
                                  'xpack.ml.newJob.simple.recognize.job.savedAriaLabel',
                                  {
                                    defaultMessage: 'Saved',
                                  }
                                )
                              : i18n.translate(
                                  'xpack.ml.newJob.simple.recognize.job.saveFailedAriaLabel',
                                  {
                                    defaultMessage: 'Save failed',
                                  }
                                )
                          }
                        />
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.jobLabel"
                          defaultMessage="Job"
                        />
                      </EuiText>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiText
                        color={datafeedResult.success ? 'secondary' : 'danger'}
                        size="xs"
                        className="eui-textNoWrap"
                        textAlign="center"
                      >
                        <EuiIcon
                          type={datafeedResult.success ? 'check' : 'cross'}
                          color={datafeedResult.success ? 'secondary' : 'danger'}
                          size="s"
                          aria-label={
                            setupResult.success
                              ? i18n.translate(
                                  'xpack.ml.newJob.simple.recognize.datafeed.savedAriaLabel',
                                  {
                                    defaultMessage: 'Saved',
                                  }
                                )
                              : i18n.translate(
                                  'xpack.ml.newJob.simple.recognize.datafeed.saveFailedAriaLabel',
                                  {
                                    defaultMessage: 'Save failed',
                                  }
                                )
                          }
                        />
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.datafeedLabel"
                          defaultMessage="Datafeed"
                        />
                      </EuiText>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiText
                        color={datafeedResult.started ? 'secondary' : 'danger'}
                        size="xs"
                        className="eui-textNoWrap"
                        textAlign="center"
                      >
                        <EuiIcon
                          type={datafeedResult.started ? 'check' : 'cross'}
                          color={datafeedResult.started ? 'secondary' : 'danger'}
                          size="s"
                          aria-label={
                            setupResult.success
                              ? i18n.translate(
                                  'xpack.ml.newJob.simple.recognize.running.startedAriaLabel',
                                  {
                                    defaultMessage: 'Started',
                                  }
                                )
                              : i18n.translate(
                                  'xpack.ml.newJob.simple.recognize.running.startFailedAriaLabel',
                                  {
                                    defaultMessage: 'Save failed',
                                  }
                                )
                          }
                        />
                        <FormattedMessage
                          id="xpack.ml.newJob.simple.recognize.runningLabel"
                          defaultMessage="Running"
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </li>
        ))}
      </ul>
    </>
  );
};
