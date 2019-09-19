/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { InfluencersSelect } from './influencers_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import {
  MultiMetricJobCreator,
  isMultiMetricJobCreator,
  PopulationJobCreator,
  isPopulationJobCreator,
} from '../../../../../common/job_creator';
import { Description } from './description';

export const Influencers: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  if (isMultiMetricJobCreator(jc) === false && isPopulationJobCreator(jc) === false) {
    return null;
  }

  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator;
  const { fields } = newJobCapsService;
  const [influencers, setInfluencers] = useState([...jobCreator.influencers]);

  useEffect(() => {
    jobCreator.removeAllInfluencers();
    influencers.forEach(i => jobCreator.addInfluencer(i));
    jobCreatorUpdate();
  }, [influencers.join()]);

  useEffect(() => {
    setInfluencers([...jobCreator.influencers]);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <InfluencersSelect
        fields={fields}
        changeHandler={setInfluencers}
        selectedInfluencers={influencers}
      />
    </Description>
  );
};
