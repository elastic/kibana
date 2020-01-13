/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { mlMessageBarService } from '../../../../../../../components/messagebar';

import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { CategorizationField } from '../categorization_field';
import { CategorizationDetector } from '../categorization_detector';
import { FieldExamples } from './field_examples';
import { ExamplesValidCallout } from './examples_valid_callout';
import { CategoryExample } from '../../../../../common/results_loader';
import { LoadingWrapper } from '../../../charts/loading_wrapper';

interface Props {
  setIsValid: (na: boolean) => void;
}

export const CategorizationDetectors: FC<Props> = ({ setIsValid }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;

  const [loadingData, setLoadingData] = useState(false);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [categorizationAnalyzerString, setCategorizationAnalyzerString] = useState(
    JSON.stringify(jobCreator.categorizationAnalyzer)
  );
  const [fieldExamples, setFieldExamples] = useState<CategoryExample[] | null>(null);
  const [examplesValid, setExamplesValid] = useState(0);
  const [sampleSize, setSampleSize] = useState(0);

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
    let updateExamples = false;
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      updateExamples = true;
    }
    const tempCategorizationAnalyzerString = JSON.stringify(jobCreator.categorizationAnalyzer);
    if (tempCategorizationAnalyzerString !== categorizationAnalyzerString) {
      setCategorizationAnalyzerString(tempCategorizationAnalyzerString);
      updateExamples = true;
    }

    if (updateExamples) {
      loadFieldExamples();
    }
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      setCategorizationFieldName(jobCreator.categorizationFieldName);
    }
  }, [jobCreatorUpdated]);

  async function loadFieldExamples() {
    if (categorizationFieldName !== null) {
      setLoadingData(true);
      try {
        const {
          valid,
          examples,
          sampleSize: tempSampleSize,
        } = await jobCreator.loadCategorizationFieldExamples();
        setFieldExamples(examples);
        setExamplesValid(valid);
        setLoadingData(false);
        setSampleSize(tempSampleSize);
      } catch (error) {
        setLoadingData(false);
        mlMessageBarService.notify.error(error);
      }
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
    <>
      <CategorizationDetector />
      <EuiHorizontalRule />
      <CategorizationField />
      {loadingData === true && (
        <LoadingWrapper hasData={false} loading={true}>
          <div />
        </LoadingWrapper>
      )}
      {fieldExamples !== null && loadingData === false && (
        <>
          <ExamplesValidCallout
            sampleSize={sampleSize}
            examplesValid={examplesValid}
            categorizationAnalyzer={jobCreator.categorizationAnalyzer}
          />
          <FieldExamples fieldExamples={fieldExamples} />
        </>
      )}
    </>
  );
};
