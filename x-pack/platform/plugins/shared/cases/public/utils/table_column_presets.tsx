/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import { css } from '@emotion/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiBadge, EuiBadgeGroup, EuiToolTip } from '@elastic/eui';
import type { ColumnPreset } from '@kbn/shared-ux-column-presets';
import type { CaseUI } from '../../common';
import { getEmptyCellValue } from '../components/empty_value';
import { SeverityHealth } from '../components/severity/config';
import { type CaseSeverity } from '../../common/types/domain';
import { FormattedRelativePreferenceDate } from '../components/formatted_date';

/**
 * @internal
 */
export const tableColumnPresetSeverity: ColumnPreset<{
  renderProps?: Partial<ComponentProps<typeof SeverityHealth>>;
}> = ({ renderProps = {} }) => ({
  width: '6em', // The longest severity string is "critical"
  minWidth: '6em',
  className: 'eui-textNoWrap',
  render: (value: CaseSeverity) => {
    if (value == null) {
      return getEmptyCellValue();
    }

    return <SeverityHealth {...renderProps} severity={value} />;
  },
});

/**
 * @internal
 */
export const tableColumnPresetDateRelative = <Shape extends object>({
  stripMs,
}: {
  stripMs: boolean;
}): Partial<EuiTableFieldDataColumnType<Shape>> => ({
  width: stripMs ? '9em' : '9.5em',
  minWidth: stripMs ? '9em' : '9.5em',
  render: (value: string | number | null) => {
    if (value == null) {
      return getEmptyCellValue();
    }

    return <FormattedRelativePreferenceDate value={value} stripMs={stripMs} />;
  },
});

/**
 * @internal
 */
export const tableColumnPresetTags = <Shape extends object>(): Partial<
  EuiTableFieldDataColumnType<Shape>
> => ({
  width: '10em',
  minWidth: '4em',
  render: (tags: CaseUI['tags']) => {
    if (tags == null || !tags.length) {
      return getEmptyCellValue();
    }

    const LINE_CLAMP = 3;
    const getLineClampedCss = css`
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: ${LINE_CLAMP};
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: normal;
    `;

    const clampedBadges = (
      <EuiBadgeGroup
        data-test-subj="case-table-column-tags"
        css={getLineClampedCss}
        gutterSize="xs"
      >
        {tags.map((tag: string, i: number) => (
          <EuiBadge
            css={css`
              max-width: 100px;
            `}
            color="hollow"
            key={`${tag}-${i}`}
            data-test-subj={`case-table-column-tags-${tag}`}
          >
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    );

    const unclampedBadges = (
      <EuiBadgeGroup data-test-subj="case-table-column-tags">
        {tags.map((tag: string, i: number) => (
          <EuiBadge
            color="hollow"
            key={`${tag}-${i}`}
            data-test-subj={`case-table-column-tags-${tag}`}
          >
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    );

    return (
      <EuiToolTip
        data-test-subj="case-table-column-tags-tooltip"
        position="left"
        content={unclampedBadges}
      >
        {clampedBadges}
      </EuiToolTip>
    );
  },
});
