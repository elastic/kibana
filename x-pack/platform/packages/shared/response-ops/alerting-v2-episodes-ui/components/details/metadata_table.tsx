/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { EuiPaddingSize } from '@elastic/eui';
import moment from 'moment';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { css } from '@emotion/react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { DEFAULT_DATE_FORMAT } from '../../constants';
import * as i18n from './translations';

export interface AlertEpisodeMetadataTableProps {
  hit: DataTableRecord;
  dataView: DataView;
  renderTable: (props: { hit: DataTableRecord; dataView: DataView }) => React.ReactNode;
  isStale: boolean;
  dataTimestamp?: string;
  dateFormat?: string;
  calloutMarginSize?: Exclude<EuiPaddingSize, 'none'>;
  controlsPaddingSize?: Exclude<EuiPaddingSize, 'none'>;
}

export const AlertEpisodeMetadataTable = ({
  hit,
  dataView,
  renderTable,
  isStale,
  dataTimestamp,
  dateFormat,
  calloutMarginSize,
  controlsPaddingSize,
}: AlertEpisodeMetadataTableProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      css={css`
        height: 100%;
      `}
    >
      {isStale && (
        <EuiFlexItem grow={false}>
          <KbnWarningCallout
            announceOnMount
            size="s"
            data-test-subj="alertingV2EpisodeMetadataTabStaleCallout"
            title={i18n.getMetadataTableStaleDataCallout(
              dataTimestamp ? moment(dataTimestamp).format(dateFormat ?? DEFAULT_DATE_FORMAT) : ''
            )}
            css={
              calloutMarginSize
                ? css`
                    margin-block-start: ${euiTheme.size[calloutMarginSize]};
                    margin-inline: ${euiTheme.size[calloutMarginSize]};
                  `
                : undefined
            }
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        grow
        css={css`
          min-block-size: 0;

          > * {
            block-size: 100%;
            min-block-size: 0;

            ${controlsPaddingSize
              ? css`
                  > :has(input[type='search']),
                  > :has([role='switch']) {
                    box-sizing: border-box;
                    max-inline-size: 100%;
                    padding-inline: ${euiTheme.size[controlsPaddingSize]};
                  }
                `
              : undefined}
          }
        `}
      >
        {renderTable({ hit, dataView })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
