/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  ALL_ERRORS,
  ACTIVE_ERRORS,
  ARCHIVED_ERRORS
} from '../../../../../common/errors';
import { URLParamsFilter } from '../URLParamsFilter';

const options = [
  {
    text: i18n.translate('xpack.apm.localFilters.options.errorStatus.all', {
      defaultMessage: 'All'
    }),
    value: ALL_ERRORS
  },
  {
    text: i18n.translate('xpack.apm.localFilters.options.errorStatus.active', {
      defaultMessage: 'Active'
    }),
    value: ACTIVE_ERRORS
  },
  {
    text: i18n.translate(
      'xpack.apm.localFilters.options.errorStatus.archived',
      {
        defaultMessage: 'Archived'
      }
    ),
    value: ARCHIVED_ERRORS
  }
];

const ErrorStatusFilter = () => {
  return (
    <URLParamsFilter
      title={i18n.translate('xpack.apm.localFilters.titles.errorStatus', {
        defaultMessage: 'Status'
      })}
      options={options}
      urlParamKey="errorStatus"
    />
  );
};

export { ErrorStatusFilter };
