/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { MLJobLink } from '../ml_job_link';
import * as labels from '../translations';
import { UptimeSettingsContext } from '../../../../contexts';
import { ShowLicenseInfo } from '../license_info';

interface Props {
  isCreatingJob: boolean;
  onClickCreate: () => void;
  onClickDelete: () => void;
  onClose: () => void;
  hasMLJob: boolean;
}

export function MachineLearningFlyoutView({
  isCreatingJob,
  onClickCreate,
  onClickDelete,
  onClose,
  hasMLJob,
}: Props) {
  const { basePath, license } = useContext(UptimeSettingsContext);

  const isLoadingMLJob = false;

  const hasPlatinumLicense = !license?.getFeature('ml')?.isAvailable;

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>{labels.ENABLE_ANOMALY_DETECTION}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!hasPlatinumLicense && <ShowLicenseInfo />}
        {hasMLJob && hasPlatinumLicense && (
          <div>
            <EuiCallOut title={labels.JOB_ALREADY_EXIST} color="success" iconType="check">
              <p>
                {labels.ML_JOB_RUNNING}
                <MLJobLink>{labels.VIEW_EXISTING_JOB}</MLJobLink>
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </div>
        )}
        <EuiText>
          <p>{labels.CREAT_ML_JOB_DESC}</p>
          <p>
            <FormattedMessage
              id="xpack.uptime.ml.enableAnomalyDetectionPanel.manageMLJobDescription"
              defaultMessage="Once a job is created, you can manage it and see more details in the {mlJobsPageLink}."
              values={{
                mlJobsPageLink: (
                  <EuiLink href={basePath + '/app/ml'}>{labels.ML_MANAGEMENT_PAGE}</EuiLink>
                ),
              }}
            />
            <em>{labels.TAKE_SOME_TIME_TEXT}</em>
          </p>
        </EuiText>

        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton
                onClick={() => onClickCreate()}
                fill
                isLoading={isCreatingJob}
                disabled={isCreatingJob || hasMLJob || isLoadingMLJob || !hasPlatinumLicense}
              >
                {labels.CREATE_NEW_JOB}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFormRow>
              <EuiButton
                onClick={() => onClickDelete()}
                fill
                disabled={isCreatingJob || !hasMLJob || isLoadingMLJob}
                color="danger"
              >
                {labels.DELETE_JOB}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
