/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
// import { ml } from '../../../../../../../services/ml_api_service';
import { CategorizationField } from '../categorization_field';
// import { useKibanaContext } from '../../../../../../../contexts/kibana';
import { FieldExamples } from './field_examples';
import { ExamplesValidCallout } from './examples_valid_callout';
import { CategoryExample } from '../../../../../common/results_loader';
// import { getNewJobDefaults } from '../../../../../../../services/ml_server_info';

interface Props {
  setIsValid: (na: boolean) => void;
}

export const CategorizationDetectors: FC<Props> = ({ setIsValid }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;

  const [loadingData, setLoadingData] = useState(false);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [fieldExamples, setFieldExamples] = useState<CategoryExample[] | null>(null);
  const [examplesValid, setExamplesValid] = useState(0);

  const [categorizationFieldName, setCategorizationFieldName] = useState(
    jobCreator.categorizationFieldName
  );

  useEffect(() => {
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      jobCreator.categorizationFieldName = categorizationFieldName;
      jobCreatorUpdate();
    }
    loadFieldExamples();
  }, [categorizationFieldName]);

  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      loadFieldExamples();
    }
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      setCategorizationFieldName(jobCreator.categorizationFieldName);
    }
  }, [jobCreatorUpdated]);

  async function loadFieldExamples() {
    if (categorizationFieldName !== null) {
      setLoadingData(true);
      const { valid, examples } = await jobCreator.loadCategorizationFieldExamples();
      setFieldExamples(examples);
      setExamplesValid(valid);
      setLoadingData(false);
    } else {
      setFieldExamples(null);
      setExamplesValid(0);
    }
    setIsValid(categorizationFieldName !== null);
  }

  useEffect(() => {
    jobCreatorUpdate();
  }, [examplesValid]);

  return (
    <Fragment>
      <CategorizationField />
      <FieldExamples fieldExamples={fieldExamples} />
      {fieldExamples !== null && <ExamplesValidCallout examplesValid={examplesValid} />}
    </Fragment>
  );
};
