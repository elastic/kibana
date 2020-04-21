/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as labels from './translations';
import { UptimeSettingsContext } from '../../../contexts';
import { ShowLicenseInfo } from './license_info';

interface Props {
  isCreatingJob: boolean;
  onClickCreate: () => void;
  onClose: () => void;
  canCreateMLJob: boolean;
}

export function MLFlyoutView({ isCreatingJob, onClickCreate, onClose, canCreateMLJob }: Props) {
  const { basePath, license } = useContext(UptimeSettingsContext);

  const isLoadingMLJob = false;

  const hasPlatinumLicense = license?.getFeature('ml')?.isAvailable;

  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="uptimeMLFlyout">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>{labels.ENABLE_ANOMALY_DETECTION}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!hasPlatinumLicense && <ShowLicenseInfo />}
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
          </p>
          <p>
            <em>{labels.TAKE_SOME_TIME_TEXT}</em>
          </p>
        </EuiText>
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} disabled={isCreatingJob || isLoadingMLJob}>
              {labels.CANCEL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uptimeMLCreateJobBtn"
              onClick={() => onClickCreate()}
              fill
              isLoading={isCreatingJob}
              disabled={isCreatingJob || isLoadingMLJob || !hasPlatinumLicense || !canCreateMLJob}
            >
              {labels.CREATE_NEW_JOB}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
