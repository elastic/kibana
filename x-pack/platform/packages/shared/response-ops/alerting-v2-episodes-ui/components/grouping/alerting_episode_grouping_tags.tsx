/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiText } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getValueByFieldPath } from '@kbn/alerting-v2-utils';
import { formatGroupingValue, getNonEmptyGroupingFields } from '../../utils/episode_grouping_data';

export interface AlertingEpisodeGroupingTagsProps {
  fields: readonly string[];
  data: Record<string, unknown>;
  /**
   * Source data view of the rule that produced the episode. When provided, grouping values are formatted
   * with each field's `fieldFormats` formatter (so typed fields like IP/date/number render correctly).
   * Without it, values fall back to an untyped best-effort format.
   */
  dataView?: DataView;
  /**
   * When `true`, render the badges as inline siblings instead of a flex row, so they share the
   * line flow of the surrounding text. Needed inside data grid cells, where the row height is a
   * line count and only inline content can be truncated by the grid's own line clamp.
   */
  inline?: boolean;
  'data-test-subj'?: string;
}

const groupingTagCss = css`
  display: block;
  min-width: 0;
  max-width: 30ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * Box each badge into exactly one line of the surrounding text (`1lh`) and center it there.
 * A hollow badge is 20px tall, so left to size itself it makes its line taller than the rest and
 * the row runs out of room for the following line. `vertical-align: top` keeps the box from
 * growing the line, which top and bottom aligned boxes only do when they do not fit.
 */
const inlineGroupingTagsCss = css`
  > * {
    display: inline-flex;
    align-items: center;
    block-size: 1lh;
    vertical-align: top;
  }
`;

function GroupingTagPopover({ field, valueText }: { field: string; valueText: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const fullLine = `${field}: ${valueText}`;

  const button = (
    <EuiBadge
      color="hollow"
      onClick={(e) => {
        // This prevents a bug with clicking the popover in the related alerts list.
        e.stopPropagation();
        setIsOpen((open) => !open);
      }}
      onClickAriaLabel={fullLine}
    >
      <span css={groupingTagCss}>{valueText}</span>
    </EuiBadge>
  );

  return (
    <EuiPopover
      aria-label={fullLine}
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downCenter"
      panelPaddingSize="s"
    >
      <EuiText size="s">
        <strong>{field}</strong>
        {`: ${valueText}`}
      </EuiText>
    </EuiPopover>
  );
}

/**
 * Hollow badges for rule grouping field **values** (from parsed episode `data`).
 * Each badge shows the value only (CSS ellipsis); popover shows **field**: value.
 */
export function AlertingEpisodeGroupingTags({
  fields,
  data,
  dataView,
  inline = false,
  'data-test-subj': dataTestSubj,
}: AlertingEpisodeGroupingTagsProps) {
  const fieldsWithValues = getNonEmptyGroupingFields(fields, data, dataView);

  if (fieldsWithValues.length === 0) {
    return null;
  }

  const tags = fieldsWithValues.map((field) => {
    const raw = getValueByFieldPath(data, field);
    return { field, valueText: formatGroupingValue(field, raw, dataView) };
  });

  if (inline) {
    return (
      <span css={inlineGroupingTagsCss} data-test-subj={dataTestSubj}>
        {tags.map(({ field, valueText }, index) => (
          <Fragment key={field}>
            {/* A real space keeps the badges apart and lets the line break between them. */}
            {index > 0 ? ' ' : null}
            <GroupingTagPopover field={field} valueText={valueText} />
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
      alignItems="center"
      data-test-subj={dataTestSubj}
    >
      {tags.map(({ field, valueText }) => (
        <EuiFlexItem grow={false} key={field}>
          <GroupingTagPopover field={field} valueText={valueText} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
