/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { dynamic } from '@kbn/shared-ux-utility';

import { useEnabledFeatures } from '../../../contexts/ml';
import type { ExportJobsFlyoutContentProps } from './export_jobs_flyout_content';

export interface Props extends Pick<ExportJobsFlyoutContentProps, 'currentTab'> {
  isDisabled: boolean;
}

const ExportJobsFlyoutContent = dynamic(async () => ({
  default: (await import('./export_jobs_flyout_content')).ExportJobsFlyoutContent,
}));

export const ExportJobsFlyout: FC<Props> = ({ isDisabled, ...rest }) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const { isADEnabled, isDFAEnabled } = useEnabledFeatures();

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  if (isADEnabled === false && isDFAEnabled === false) {
    return null;
  }

  return (
    <>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <ExportJobsFlyoutContent
          onClose={() => setShowFlyout(false)}
          {...{ isADEnabled, isDFAEnabled, ...rest }}
        />
      )}
    </>
  );
};

const FlyoutButton: FC<{ isDisabled: boolean; onClick(): void }> = ({ isDisabled, onClick }) => {
  return (
    <EuiButtonEmpty
      iconType="exportAction"
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlJobsExportButton"
    >
      <FormattedMessage id="xpack.ml.importExport.exportButton" defaultMessage="Export jobs" />
    </EuiButtonEmpty>
  );
};
