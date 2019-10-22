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
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ModuleJobUI, SAVE_STATE } from '../page';

interface ModuleJobsProps {
  jobs: ModuleJobUI[];
  jobPrefix: string;
  saveState: SAVE_STATE;
}

const SETUP_RESULTS_WIDTH = '200px';

export const ModuleJobs: FC<ModuleJobsProps> = ({ jobs, jobPrefix, saveState }) => {
  const isSaving = saveState === SAVE_STATE.SAVING;
  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage id="xpack.ml.newJob.recognize.jobsTitle" defaultMessage="Jobs" />
        </h4>
      </EuiTitle>

      <EuiSpacer size="s" />

      {saveState !== SAVE_STATE.SAVING && saveState !== SAVE_STATE.NOT_SAVED && (
        <EuiFlexGroup justifyContent="flexEnd" responsive={false} gutterSize="s">
          <EuiFlexItem style={{ width: SETUP_RESULTS_WIDTH }} grow={false}>
            <EuiFlexGroup justifyContent="spaceAround" responsive={false} gutterSize="s">
              <EuiFlexItem grow={1}>
                <EuiText size="s" textAlign="center">
                  <FormattedMessage id="xpack.ml.newJob.recognize.jobLabel" defaultMessage="Job" />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size="s" textAlign="center">
                  <FormattedMessage
                    id="xpack.ml.newJob.recognize.datafeedLabel"
                    defaultMessage="Datafeed"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size="s" textAlign="center">
                  <FormattedMessage
                    id="xpack.ml.newJob.recognize.runningLabel"
                    defaultMessage="Running"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <ul>
        {jobs.map(({ id, config: { description }, setupResult, datafeedResult }, i) => (
          <li key={id}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              justifyContent="spaceBetween"
              responsive={false}
            >
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
              <EuiFlexItem grow={false} style={{ width: SETUP_RESULTS_WIDTH }}>
                {isSaving && <EuiLoadingSpinner size="m" />}
                {setupResult && datafeedResult && (
                  <EuiFlexGroup
                    gutterSize="s"
                    wrap={false}
                    responsive={false}
                    justifyContent="spaceAround"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={setupResult.success ? 'check' : 'cross'}
                        color={setupResult.success ? 'secondary' : 'danger'}
                        size="m"
                        aria-label={
                          setupResult.success
                            ? i18n.translate('xpack.ml.newJob.recognize.job.savedAriaLabel', {
                                defaultMessage: 'Saved',
                              })
                            : i18n.translate('xpack.ml.newJob.recognize.job.saveFailedAriaLabel', {
                                defaultMessage: 'Save failed',
                              })
                        }
                      />
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={datafeedResult.success ? 'check' : 'cross'}
                        color={datafeedResult.success ? 'secondary' : 'danger'}
                        size="m"
                        aria-label={
                          setupResult.success
                            ? i18n.translate('xpack.ml.newJob.recognize.datafeed.savedAriaLabel', {
                                defaultMessage: 'Saved',
                              })
                            : i18n.translate(
                                'xpack.ml.newJob.recognize.datafeed.saveFailedAriaLabel',
                                {
                                  defaultMessage: 'Save failed',
                                }
                              )
                        }
                      />
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={datafeedResult.started ? 'check' : 'cross'}
                        color={datafeedResult.started ? 'secondary' : 'danger'}
                        size="m"
                        aria-label={
                          setupResult.success
                            ? i18n.translate('xpack.ml.newJob.recognize.running.startedAriaLabel', {
                                defaultMessage: 'Started',
                              })
                            : i18n.translate(
                                'xpack.ml.newJob.recognize.running.startFailedAriaLabel',
                                {
                                  defaultMessage: 'Start failed',
                                }
                              )
                        }
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            {i < jobs.length - 1 && <EuiHorizontalRule margin="s" />}
          </li>
        ))}
      </ul>
    </>
  );
};
