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

export function LatestVersions({ latestVersions }) {
  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.monitoring.beats.overview.latestVersion.tableCaption', {
        defaultMessage: 'Latest version counts',
      })}
      items={latestVersions}
      columns={[
        {
          field: 'version',
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

LatestVersions.propTypes = {
  latestVersions: PropTypes.arrayOf(
    PropTypes.shape({
      version: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
};
