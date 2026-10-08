/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import type { SerializedStyles } from '@emotion/serialize';
import adImage from './machine_learning_cog.svg';
import { useMlKibana } from '../../../../contexts/kibana';
import { useCreateAndNavigateToManagementMlLink } from '../../../../contexts/kibana/use_create_url';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check';
import { MLEmptyPromptCard } from '../../../../components/overview/ml_empty_prompt_card';

export const AnomalyDetectionEmptyState: FC<{
  showDocsLink?: boolean;
  centered?: boolean;
  customCss?: SerializedStyles;
  iconSize?: 'fullWidth' | 'original' | 's' | 'm' | 'l' | 'xl';
  titleSize?: 'xs' | 's' | 'm' | 'l';
}> = ({ showDocsLink = false, centered = false, customCss, iconSize, titleSize }) => {
  const canCreateJob = usePermissionCheck('canCreateJob');
  const disableCreateAnomalyDetectionJob = !canCreateJob || !mlNodesAvailable();

  const {
    services: { docLinks },
  } = useMlKibana();

  const redirectToCreateJobSelectIndexPage = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    'anomaly_detection'
  );

  return (
    <MLEmptyPromptCard
      customCss={customCss}
      iconSrc={adImage}
      iconAlt={i18n.translate('xpack.ml.overview.anomalyDetection.title', {
        defaultMessage: 'Anomaly detection',
      })}
      iconSize={iconSize}
      titleSize={titleSize}
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
      actions={
        <EuiButton
          color="primary"
          fill
          iconType="plusCircle"
          onClick={redirectToCreateJobSelectIndexPage}
          isDisabled={disableCreateAnomalyDetectionJob}
          data-test-subj="mlCreateNewJobButton"
        >
          <FormattedMessage
            id="xpack.ml.overview.anomalyDetection.createJobButtonText"
            defaultMessage="Create anomaly detection job"
          />
        </EuiButton>
      }
      docsLink={showDocsLink ? docLinks.links.ml.anomalyDetection : undefined}
      docsLinkDataTestSubj="mlAnomalyDetectionReadDocumentationButton"
      centered={centered}
      data-test-subj="mlAnomalyDetectionEmptyState"
    />
  );
};
