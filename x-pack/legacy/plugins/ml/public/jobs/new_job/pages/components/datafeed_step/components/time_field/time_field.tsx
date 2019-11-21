/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { TimeFieldSelect } from './time_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { AdvancedJobCreator } from '../../../../../common/job_creator';
import { Description } from './description';

export const TimeField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;
  const { dateFields } = newJobCapsService;
  const [timeFieldName, setTimeFieldName] = useState(jobCreator.timeFieldName);

  useEffect(() => {
    jobCreator.timeFieldName = timeFieldName;
    jobCreatorUpdate();
  }, [timeFieldName]);

  useEffect(() => {
    setTimeFieldName(jobCreator.timeFieldName);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <TimeFieldSelect
        fields={dateFields}
        changeHandler={setTimeFieldName}
        selectedField={timeFieldName}
      />
    </Description>
  );
};
