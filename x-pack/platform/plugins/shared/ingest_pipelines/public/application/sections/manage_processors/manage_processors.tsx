/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';

import { useKibana } from '../../../shared_imports';
import { PipelineAppHeader } from '../../components';
import { UIM_MANAGE_PROCESSORS } from '../../constants';
import { GeoipList } from './geoip_list';

export const ManageProcessors: React.FunctionComponent = () => {
  const { services } = useKibana();
  const history = useHistory();
  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_MANAGE_PROCESSORS);
    services.breadcrumbs.setBreadcrumbs('manage_processors');
  }, [services.metric, services.breadcrumbs]);

  return (
    <>
      <PipelineAppHeader
        title={i18n.translate('xpack.ingestPipelines.manageProcessors.pageTitle', {
          defaultMessage: 'Manage Processors',
        })}
        history={history}
      />

      <GeoipList />
    </>
  );
};
