/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { EuiPanel, EuiFlexGrid, EuiFlexItem, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator, isAdvancedJobCreator } from '../../../../../common/job_creator';
import { detectorToString } from '../../../../../../../util/string_utils';

interface Props {
  onEditJob: (i: number) => void;
  onDeleteJob: (i: number) => void;
}

export const DetectorList: FC<Props> = ({ onEditJob, onDeleteJob }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);

  if (isAdvancedJobCreator(jc) === false) {
    return null;
  }
  const jobCreator = jc as AdvancedJobCreator;
  const [detectors, setDetectors] = useState(jobCreator.detectors);

  useEffect(() => {
    setDetectors(jobCreator.detectors);
  }, [jobCreatorUpdated]);

  return (
    <Fragment>
      <EuiFlexGrid columns={3}>
        {detectors.map((d, i) => (
          <EuiFlexItem key={i}>
            <EuiPanel paddingSize="m">
              <EuiFlexGroup>
                <EuiFlexItem>{detectorToString(d)}</EuiFlexItem>
                <EuiFlexItem grow={false} style={{ margin: '8px' }}>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <EuiButtonIcon
                        color="primary"
                        onClick={() => onEditJob(i)}
                        iconType="pencil"
                        aria-label="Edit"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => onDeleteJob(i)}
                        iconType="trash"
                        aria-label="Delete"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </Fragment>
  );
};
