/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import { DescriptionVertical } from '../../../../../../../../../data_frame_analytics/common/description_vertical';
import { useDashboardService } from '../../../../../../../../../services/dashboard_service';
import { CustomUrls } from '../../../../../../../../../components/custom_urls/custom_urls';
import { JobCreatorContext } from '../../../../../job_creator_context';
import type { CombinedJob } from '../../../../../../../../../../../common/types/anomaly_detection_jobs';

export const CustomUrlsSelection: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);

  const setCustomUrls = (customUrls: MlUrlConfig[]) => {
    jobCreator.customUrls = customUrls;
    jobCreatorUpdate();
  };

  const combinedJob: CombinedJob = {
    ...jobCreator.jobConfig,
    datafeed_config: jobCreator.datafeedConfig,
  };
  const dashboardService = useDashboardService();

  return (
    <DescriptionVertical
      title={i18n.translate(
        'xpack.ml.dataframe.analytics.create.detailsStep.additionalSection.customUrls.title',
        {
          defaultMessage: 'Custom URLs',
        }
      )}
      descriptionMessageId="xpack.ml.dataframe.analytics.create.detailsStep.additionalSection.customUrlsSelection.description"
      descriptionDefaultMessage="Provide links from analytics job results to Kibana dashboards, Discover, or other web pages. {learnMoreLink}"
      learnMoreLinkMessageId="xpack.ml.dataframe.analytics.create.detailsStep.additionalSection.customUrlsSelection.learnMoreLinkText"
    >
      <CustomUrls
        job={combinedJob}
        jobCustomUrls={jobCreator.customUrls ?? []}
        setCustomUrls={setCustomUrls}
        editMode="modal"
        dashboardService={dashboardService}
      />
    </DescriptionVertical>
  );
};
