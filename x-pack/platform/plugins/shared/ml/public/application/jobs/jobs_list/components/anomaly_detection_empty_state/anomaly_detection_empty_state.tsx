/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SerializedStyles } from '@emotion/serialize';
import adImage from './machine_learning_cog.png';
import { ML_PAGES } from '../../../../../../common/constants/locator';
import { useMlKibana, useMlManagementLocator } from '../../../../contexts/kibana';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check';
import { MLEmptyPromptCard } from '../../../../components/overview/ml_empty_prompt_card';

export const AnomalyDetectionEmptyState: FC<{
  showDocsLink?: boolean;
  customCss?: SerializedStyles;
  iconSize?: 'fullWidth' | 'original' | 's' | 'm' | 'l' | 'xl';
}> = ({ showDocsLink = false, customCss, iconSize }) => {
  const canCreateJob = usePermissionCheck('canCreateJob');
  const disableCreateAnomalyDetectionJob = !canCreateJob || !mlNodesAvailable();

  const {
    services: { docLinks },
  } = useMlKibana();

  const mlLocator = useMlManagementLocator();

  const redirectToCreateJobSelectIndexPage = async () => {
    if (!mlLocator) return;

    await mlLocator.navigate({
      sectionId: 'ml',
      appId: `anomaly_detection/${ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX}`,
    });
  };

  return (
    <MLEmptyPromptCard
      customCss={customCss}
      layout="horizontal"
      hasBorder={true}
      hasShadow={false}
      iconSrc={adImage}
      iconAlt={i18n.translate('xpack.ml.overview.anomalyDetection.title', {
        defaultMessage: 'Anomaly detection',
      })}
      iconSize={iconSize}
      title={i18n.translate('xpack.ml.overview.anomalyDetection.createFirstJobMessage', {
        defaultMessage: 'Anomaly detection',
      })}
      body={
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.emptyPromptText"
            defaultMessage="Automatically spot anomalies and surface issues before they become incidents, with detection that adapts to the unique patterns in your data."
          />
        </EuiText>
      }
      actions={[
        ...[
          <EuiButton
            color="text"
            onClick={redirectToCreateJobSelectIndexPage}
            isDisabled={disableCreateAnomalyDetectionJob}
            data-test-subj="mlCreateNewJobButton"
          >
            <FormattedMessage
              id="xpack.ml.overview.anomalyDetection.createJobButtonText"
              defaultMessage="Create anomaly detection job"
            />
          </EuiButton>,
        ],
        ...(showDocsLink
          ? [
              <EuiButtonEmpty
                target="_blank"
                href={docLinks.links.ml.anomalyDetection}
                data-test-subj="mlAnalyticsReadDocumentationButton"
                iconType="popout"
                iconSide="left"
              >
                <FormattedMessage
                  id="xpack.ml.common.readDocumentationLink"
                  defaultMessage="Read documentation"
                />
              </EuiButtonEmpty>,
            ]
          : []),
      ]}
      data-test-subj="mlAnomalyDetectionEmptyState"
    />
  );
};
