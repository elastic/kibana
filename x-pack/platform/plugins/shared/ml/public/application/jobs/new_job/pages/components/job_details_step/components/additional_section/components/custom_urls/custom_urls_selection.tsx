/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useMemo } from 'react';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { CustomUrlsDescription } from '../../../../../../../../../components/custom_urls/custom_urls_description';
import { useDashboardService } from '../../../../../../../../../services/dashboard_service';
import { CustomUrls } from '../../../../../../../../../components/custom_urls/custom_urls';
import { JobCreatorContext } from '../../../../../job_creator_context';
import type { CombinedJob } from '../../../../../../../../../../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../../../../../../../../../contexts/kibana';

export const CustomUrlsSelection: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const docsUrl = docLinks.links.ml.customUrls;
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

  const description = useMemo(
    () => (
      <FormattedMessage
        id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrlsSelection.description"
        defaultMessage="Provide links from anomalies to Kibana dashboards, Discover, or other web pages. {learnMoreLink}"
        values={{
          learnMoreLink: (
            <EuiLink href={docsUrl} target="_blank">
              <FormattedMessage
                id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrlsSelection.learnMoreLinkText"
                defaultMessage="Learn more"
              />
            </EuiLink>
          ),
        }}
      />
    ),
    [docsUrl]
  );

  return (
    <CustomUrlsDescription description={description}>
      <CustomUrls
        job={combinedJob}
        jobCustomUrls={jobCreator.customUrls ?? []}
        setCustomUrls={setCustomUrls}
        editMode="modal"
        dashboardService={dashboardService}
      />
    </CustomUrlsDescription>
  );
};
