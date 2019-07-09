/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import { EuiSwitch } from '@elastic/eui';
import { KibanaConfigContext } from '../../lib/adapters/framework/kibana_framework_adapter';
import { startDatafeeds, stopDatafeeds } from './api';

export interface JobDetailProps {
  jobName: string;
  jobDescription: string;
  isChecked: boolean;
  onJobStateChange: Function;
}

export const JobDetail = React.memo<JobDetailProps>(({ jobName, isChecked, onJobStateChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const config = useContext(KibanaConfigContext);
  const headers = { 'kbn-version': config.kbnVersion };

  const startDatafeed = async (enable: boolean) => {
    if (enable) {
      await startDatafeeds([`datafeed-${jobName}`], headers);
    } else {
      await stopDatafeeds([`datafeed-${jobName}`], headers);
    }
    onJobStateChange();
    setIsLoading(false);
  };

  return (
    <EuiSwitch
      data-test-subj="job-detail-switch"
      disabled={isLoading}
      checked={isChecked}
      onChange={e => {
        setIsLoading(true);
        startDatafeed(e.target.checked);
      }}
    />
  );
});
