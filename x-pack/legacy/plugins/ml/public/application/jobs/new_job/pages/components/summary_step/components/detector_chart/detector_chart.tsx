/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext } from 'react';
import { JobCreatorContext } from '../../../job_creator_context';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';
import { SingleMetricView } from '../../../pick_fields_step/components/single_metric_view';
import { MultiMetricView } from '../../../pick_fields_step/components/multi_metric_view';
import { PopulationView } from '../../../pick_fields_step/components/population_view';
import { AdvancedView } from '../../../pick_fields_step/components/advanced_view';
import { CategorizationView } from '../../../pick_fields_step/components/categorization_view';

export const DetectorChart: FC = () => {
  const { jobCreator } = useContext(JobCreatorContext);

  return (
    <Fragment>
      {jobCreator.type === JOB_TYPE.SINGLE_METRIC && <SingleMetricView isActive={false} />}
      {jobCreator.type === JOB_TYPE.MULTI_METRIC && <MultiMetricView isActive={false} />}
      {jobCreator.type === JOB_TYPE.POPULATION && <PopulationView isActive={false} />}
      {jobCreator.type === JOB_TYPE.ADVANCED && <AdvancedView isActive={false} />}
      {jobCreator.type === JOB_TYPE.CATEGORIZATION && <CategorizationView isActive={false} />}
    </Fragment>
  );
};
