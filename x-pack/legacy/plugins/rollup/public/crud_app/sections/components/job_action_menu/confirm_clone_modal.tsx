/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiOverlayMask,
  EuiModalBody,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { injectI18n, InjectedIntl } from '@kbn/i18n/react';
import { Job } from '../../../../../types';

interface Props {
  onClose: () => void;
  intl: InjectedIntl;
  jobs: Job[];
}

function generateTextInputs(jobs: Job[]) {
  return jobs.map(job => {
    return <input placeholder={job.id} />;
  });
}

function Modal(props: Props) {
  const { onClose, intl, jobs } = props;
  const multipleJobs = jobs.length <= 1;
  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          {intl.formatMessage(
            {
              id: 'xpack.rollupJobs.jobActionMenu.cloneModal.heading',
              defaultMessage: 'Clone {multipleJobs, plural, one {job} other {jobs}}',
            },
            { multipleJobs }
          )}
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFlexGroup direction={'column'} justifyContent="flexStart" gutterSize="m">
            <EuiFlexItem>{generateTextInputs(jobs) || null}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
}

export const ConfirmCloneModal = injectI18n(Modal);
