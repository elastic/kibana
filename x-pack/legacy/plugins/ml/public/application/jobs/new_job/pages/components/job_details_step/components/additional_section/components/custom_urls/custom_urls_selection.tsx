/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { CustomUrls } from '../../../../../../../../jobs_list/components/edit_job_flyout/tabs/custom_urls';
import { UrlConfig } from '../../../../../../../../../../../common/types/custom_urls';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';

export const CustomUrlsSelection: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);

  const setCustomUrls = (customUrls: UrlConfig[]) => {
    jobCreator.customUrls = customUrls;
    jobCreatorUpdate();
  };

  return (
    <Description>
      <CustomUrls
        job={jobCreator.jobConfig}
        jobCustomUrls={jobCreator.customUrls ?? []}
        setCustomUrls={setCustomUrls}
        editMode="modal"
      />
    </Description>
  );
};
