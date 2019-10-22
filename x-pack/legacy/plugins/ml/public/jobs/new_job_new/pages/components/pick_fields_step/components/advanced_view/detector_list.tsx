/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiTitle,
  EuiPanel,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiSpacer,
  EuiCallOut,
  EuiHorizontalRule,
} from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator } from '../../../../../common/job_creator';
import { detectorToString } from '../../../../../../../util/string_utils';

interface Props {
  isActive: boolean;
  onEditJob: (i: number) => void;
  onDeleteJob: (i: number) => void;
}

export const DetectorList: FC<Props> = ({ isActive, onEditJob, onDeleteJob }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;
  const [detectors, setDetectors] = useState(jobCreator.detectors);

  useEffect(() => {
    setDetectors(jobCreator.detectors);
  }, [jobCreatorUpdated]);

  const Buttons: FC<{ index: number }> = ({ index }) => {
    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiButtonIcon
            color="primary"
            onClick={() => onEditJob(index)}
            iconType="pencil"
            aria-label={i18n.translate(
              'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorList.editButton',
              {
                defaultMessage: 'Edit',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonIcon
            color="danger"
            onClick={() => onDeleteJob(index)}
            iconType="trash"
            aria-label={i18n.translate(
              'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorList.deleteButton',
              {
                defaultMessage: 'Delete',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorList.title"
            defaultMessage="Detectors"
          />
        </h3>
      </EuiTitle>

      <NoDetectorsWarning show={detectors.length === 0} />

      <EuiSpacer size="m" />

      <EuiFlexGrid columns={3}>
        {detectors.map((d, i) => (
          <EuiFlexItem key={i}>
            <EuiPanel paddingSize="m">
              <EuiFlexGroup>
                <EuiFlexItem>
                  {d.detector_description !== undefined ? (
                    <div style={{ fontWeight: 'bold' }}>{d.detector_description}</div>
                  ) : (
                    detectorToString(d)
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ margin: '8px' }}>
                  <Buttons index={i} />
                </EuiFlexItem>
              </EuiFlexGroup>
              {d.detector_description !== undefined && (
                <Fragment>
                  <EuiHorizontalRule margin="s" />
                  {detectorToString(d)}
                </Fragment>
              )}
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </Fragment>
  );
};

const NoDetectorsWarning: FC<{ show: boolean }> = ({ show }) => {
  if (show === false) {
    return null;
  }

  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.noDetectorsCallout.title', {
          defaultMessage: 'No detectors',
        })}
        iconType="alert"
      >
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.noDetectorsCallout.message"
          defaultMessage="At least one detector is needed to create a job."
        />
      </EuiCallOut>
      <EuiSpacer size="s" />
    </Fragment>
  );
};
