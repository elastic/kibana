/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../../shared_imports';
import { UIM_MANAGE_PROCESSORS } from '../../constants';
import { GeoipList } from './geoip_list';

export const ManageProcessors: React.FunctionComponent = () => {
  const { services } = useKibana();
  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_MANAGE_PROCESSORS);
    services.breadcrumbs.setBreadcrumbs('manage_processors');
  }, [services.metric, services.breadcrumbs]);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="manageProcessorsTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.pageTitle"
              defaultMessage="Manage Processors"
            />
          </span>
        }
      />

      <EuiSpacer size="l" />

      <GeoipList />
    </>
  );
};
