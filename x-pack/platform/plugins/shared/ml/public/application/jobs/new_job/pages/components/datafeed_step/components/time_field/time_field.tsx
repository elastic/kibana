/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { TimeFieldSelect } from './time_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { useNewJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import type { AdvancedJobCreator } from '../../../../../common/job_creator';
import { Description } from './description';

export const TimeField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;
  const { dateFields } = useNewJobCapsService();
  const [timeFieldName, setTimeFieldName] = useState(jobCreator.timeFieldName);
  const titleId = useGeneratedHtmlId({
    prefix: 'timeField',
  });
  useEffect(() => {
    jobCreator.timeFieldName = timeFieldName;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFieldName]);

  useEffect(() => {
    setTimeFieldName(jobCreator.timeFieldName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  return (
    <Description titleId={titleId}>
      <TimeFieldSelect
        fields={dateFields}
        changeHandler={setTimeFieldName}
        selectedField={timeFieldName}
        timeFieldTitleId={titleId}
      />
    </Description>
  );
};
