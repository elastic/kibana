/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext, useState, useEffect } from 'react';

import type { Aggregation, Field } from '@kbn/ml-anomaly-utils';
import { JobCreatorContext } from '../../../job_creator_context';
import type { AdvancedJobCreator } from '../../../../../common/job_creator';
import { useNewJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { MetricSelector } from './metric_selector';
import type { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';
import { DetectorList } from './detector_list';
import type { ModalPayload } from '../advanced_detector_modal/advanced_detector_modal';

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
  description: null,
  customRules: null,
  useNull: null,
};

export const AdvancedDetectors: FC<Props> = ({ setIsValid }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;

  const { fields, aggs } = useNewJobCapsService();
  const [modalPayload, setModalPayload] = useState<ModalPayload | null>(null);

  useEffect(() => {
    setIsValid(jobCreator.detectors.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

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
        dtr.excludeFrequent,
        dtr.description,
        dtr.useNull
      );
    } else {
      jobCreator.editDetector(
        dtr.agg as Aggregation,
        dtr.field as Field,
        dtr.byField,
        dtr.overField,
        dtr.partitionField,
        dtr.excludeFrequent,
        dtr.description,
        index,
        dtr.useNull
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

  return (
    <Fragment>
      <DetectorList isActive={true} onEditJob={onEditJob} onDeleteJob={onDeleteJob} />
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
