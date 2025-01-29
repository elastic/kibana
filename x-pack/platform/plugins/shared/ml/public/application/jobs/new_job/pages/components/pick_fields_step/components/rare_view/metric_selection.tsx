/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { RareFieldSelector } from '../rare_field';
import { JobCreatorContext } from '../../../job_creator_context';
import type { RareJobCreator } from '../../../../../common/job_creator';
import { RareDetector } from '../rare_detector';
import { PopulationFieldSelector } from '../population_field';
import { DetectorDescription } from './detector_description';
import { RARE_DETECTOR_TYPE } from './rare_view';

interface Props {
  setIsValid: (na: boolean) => void;
  setRareDetectorType(t: RARE_DETECTOR_TYPE): void;
  rareDetectorType: RARE_DETECTOR_TYPE;
}

export const RareDetectors: FC<Props> = ({ setIsValid, rareDetectorType, setRareDetectorType }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;
  const [detectorValid, setDetectorValid] = useState(false);

  useEffect(() => {
    let valid = false;
    if (jobCreator.rareField !== null) {
      if (rareDetectorType === RARE_DETECTOR_TYPE.RARE) {
        // Rare only requires a rare field to be set
        valid = true;
      } else if (jobCreator.populationField !== null) {
        // all others need a need the population field to be set
        valid = true;
      }
    }
    setIsValid(valid);
    setDetectorValid(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  return (
    <>
      <RareDetector onChange={setRareDetectorType} />
      <>
        <EuiHorizontalRule />
        <EuiFlexGroup>
          <EuiFlexItem>
            <RareFieldSelector />
          </EuiFlexItem>
          <EuiFlexItem>
            {rareDetectorType !== RARE_DETECTOR_TYPE.RARE && <PopulationFieldSelector />}
          </EuiFlexItem>
        </EuiFlexGroup>
        {detectorValid && (
          <>
            <EuiSpacer size="m" />
            <DetectorDescription detectorType={rareDetectorType} />
          </>
        )}
      </>
    </>
  );
};
