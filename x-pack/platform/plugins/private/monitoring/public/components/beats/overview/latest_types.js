/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function LatestTypes({ latestTypes }) {
  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.monitoring.beats.overview.latestType.tableCaption', {
        defaultMessage: 'Latest types',
      })}
      items={latestTypes}
      columns={[
        {
          field: 'type',
          name: '',
        },
        {
          field: 'count',
          dataType: 'number',
          name: '',
        },
      ]}
    />
  );
}

LatestTypes.propTypes = {
  latestTypes: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
};
