/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import moment from 'moment';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { css } from '@emotion/react';
import * as i18n from './translations';

export interface AlertEpisodeMetadataTableProps {
  hit: DataTableRecord;
  dataView: DataView;
  renderTable: (props: { hit: DataTableRecord; dataView: DataView }) => React.ReactNode;
  isStale: boolean;
  dataTimestamp?: string;
  dateFormat?: string;
}

export const AlertEpisodeMetadataTable = ({
  hit,
  dataView,
  renderTable,
  isStale,
  dataTimestamp,
  dateFormat,
}: AlertEpisodeMetadataTableProps) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    css={css`
      height: 100%;
    `}
  >
    {isStale && (
      <EuiFlexItem grow={false}>
        <EuiCallOut
          announceOnMount
          size="s"
          color="warning"
          iconType="clock"
          data-test-subj="alertingV2EpisodeMetadataTabStaleCallout"
          title={i18n.getMetadataTableStaleDataCallout(
            dataTimestamp
              ? moment(dataTimestamp).format(dateFormat ?? 'MMM D, YYYY @ HH:mm:ss.SSS')
              : ''
          )}
        />
      </EuiFlexItem>
    )}
    <EuiFlexItem
      grow
      css={css`
        min-height: 0;
      `}
    >
      {renderTable({ hit, dataView })}
    </EuiFlexItem>
  </EuiFlexGroup>
);
