/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator, isAdvancedJobCreator } from '../../../../../common/job_creator';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { Aggregation, Field } from '../../../../../../../../common/types/fields';
import { MetricSelector } from './metric_selector';
import { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';
import { DetectorList } from './detector_list';
import { ModalPayload } from './create_detector_modal';

interface Props {
  setIsValid: (na: boolean) => void;
}

const emptyRichDetector: RichDetector = {
  agg: null,
  field: null,
  byField: null,
  overField: null,
  partitionField: null,
  excludeFrequent: null,
};

export const AdvancedDetectors: FC<Props> = ({ setIsValid }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);

  if (isAdvancedJobCreator(jc) === false) {
    return null;
  }
  const jobCreator = jc as AdvancedJobCreator;

  const { fields, aggs } = newJobCapsService;
  // const [detector, setDetector] = useState(emptyRichDetector);
  // const [bucketSpanMs, setBucketSpanMs] = useState(jobCreator.bucketSpanMs);
  const [modalPayload, setModalPayload] = useState<ModalPayload | null>(null);

  function closeModal() {
    setModalPayload(null);
  }

  function detectorChangeHandler(dtr: RichDetector, index?: number) {
    if (index === undefined) {
      jobCreator.addDetector(
        dtr.agg as Aggregation,
        dtr.field as Field,
        dtr.byField,
        dtr.overField,
        dtr.partitionField,
        dtr.excludeFrequent
      );
    } else {
      jobCreator.editDetector(
        dtr.agg as Aggregation,
        dtr.field as Field,
        dtr.byField,
        dtr.overField,
        dtr.partitionField,
        dtr.excludeFrequent,
        index
      );
    }
    jobCreatorUpdate();
    setModalPayload(null);
  }

  function showModal() {
    setModalPayload({ detector: emptyRichDetector });
  }

  function onDeleteJob(i: number) {
    jobCreator.removeDetector(i);
    jobCreatorUpdate();
  }

  function onEditJob(i: number) {
    const dtr = jobCreator.richDetectors[i];
    if (dtr !== undefined) {
      setModalPayload({ detector: dtr, index: i });
    }
  }

  // useEffect(() => {
  //   if (detector.agg !== null) {
  //     setModalPayload(null);
  //   }
  // }, [detector]);

  // watch for change in jobCreator
  // useEffect(() => {
  //   if (jobCreator.bucketSpanMs !== bucketSpanMs) {
  //     setBucketSpanMs(jobCreator.bucketSpanMs);
  //   }
  // }, [jobCreatorUpdated]);

  return (
    <Fragment>
      <DetectorList onEditJob={onEditJob} onDeleteJob={onDeleteJob} />
      <MetricSelector
        payload={modalPayload}
        fields={fields}
        aggs={aggs}
        detectorChangeHandler={detectorChangeHandler}
        showModal={showModal}
        closeModal={closeModal}
      />
    </Fragment>
  );
};
