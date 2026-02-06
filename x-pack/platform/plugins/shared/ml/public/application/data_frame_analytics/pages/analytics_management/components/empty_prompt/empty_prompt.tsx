/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SerializedStyles } from '@emotion/serialize';
import dfaImage from './analysis_monitors.png';
import { mlNodesAvailable } from '../../../../../ml_nodes_check';
import { useMlKibana, useMlManagementLocator } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../../common/constants/locator';
import { usePermissionCheck } from '../../../../../capabilities/check_capabilities';
import { MLEmptyPromptCard } from '../../../../../components/overview/ml_empty_prompt_card';

export const TrainedAnalysisTitle = () => (
  <EuiTitle size="s">
    <h3>
      <FormattedMessage
        id="xpack.ml.dataFrame.analyticsList.emptyPromptTitle"
        defaultMessage="Trained analysis of your data"
      />
    </h3>
  </EuiTitle>
);

export const AnalyticsEmptyPrompt: FC<{
  showDocsLink?: boolean;
  customCss?: SerializedStyles;
  iconSize?: 'fullWidth' | 'original' | 's' | 'm' | 'l' | 'xl';
}> = ({ showDocsLink = false, customCss, iconSize }) => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const mlLocator = useMlManagementLocator();

  const [canCreateDataFrameAnalytics, canStartStopDataFrameAnalytics] = usePermissionCheck([
    'canCreateDataFrameAnalytics',
    'canStartStopDataFrameAnalytics',
  ]);

  const disabled =
    !mlNodesAvailable() || !canCreateDataFrameAnalytics || !canStartStopDataFrameAnalytics;

  const navigateToSourceSelection = async () => {
    if (!mlLocator) return;

    await mlLocator.navigate({
      sectionId: 'ml',
      appId: `analytics/${ML_PAGES.DATA_FRAME_ANALYTICS_SOURCE_SELECTION}`,
    });
  };

  return (
    <MLEmptyPromptCard
      customCss={customCss}
      iconSrc={dfaImage}
      iconAlt={i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
        defaultMessage: 'Tailored predictive models',
      })}
      iconSize={iconSize}
      title={i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
        defaultMessage: 'Tailored predictive models',
      })}
      body={
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.overview.analyticsList.emptyPromptText"
            defaultMessage="Categorize data, predict values, and detect outliers using supervised and unsupervised machine learning in data frame analytics."
          />
        </EuiText>
      }
      actions={[
        ...[
          <EuiButton
            onClick={navigateToSourceSelection}
            isDisabled={disabled}
            color="text"
            data-test-subj="mlAnalyticsCreateFirstButton"
          >
            <FormattedMessage
              id="xpack.ml.dataFrame.analyticsList.emptyPromptButtonText"
              defaultMessage="Create data frame analytics job"
            />
          </EuiButton>,
        ],
        ...(showDocsLink
          ? [
              <EuiButtonEmpty
                target="_blank"
                href={docLinks.links.ml.dataFrameAnalytics}
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
      data-test-subj="mlNoDataFrameAnalyticsFound"
    />
  );
};
