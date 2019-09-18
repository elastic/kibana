/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover, EuiPopoverTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { JobStatus, JobType } from '../../../../common/log_analysis';
import { LogAnalysisJobConfigurationSection } from './log_analysis_job_configuration_section';
import { LogAnalysisJobStatusSection } from './log_analysis_job_status_section';

export const LogAnalysisJobStatusPopover: React.FunctionComponent<{
  anchorElement: React.ReactElement;
  closePopover: () => void;
  isOpen: boolean;
  jobStatus: Record<JobType, JobStatus>;
}> = ({ anchorElement, closePopover, isOpen, jobStatus }) => {
  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={anchorElement}
      isOpen={isOpen}
      closePopover={closePopover}
    >
      <EuiPopoverTitle>
        <FormattedMessage
          id="xpack.infra.logs.analysis.jobStatusPopover.popoverTitle"
          defaultMessage="ML job status"
        />
      </EuiPopoverTitle>
      <PopoverContent>
        <LogAnalysisJobConfigurationSection />
        <EuiSpacer />
        <LogAnalysisJobStatusSection jobStatus={jobStatus} />
      </PopoverContent>
    </EuiPopover>
  );
};

const PopoverContent = euiStyled.div`
  width: 400px;
`;
