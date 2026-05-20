/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiText } from '@elastic/eui';
import {
  formatGroupingValueForDisplay,
  getNonEmptyGroupingFields,
  getValueByFieldPath,
} from '../../utils/episode_grouping_data';

export interface AlertingEpisodeGroupingTagsProps {
  fields: readonly string[];
  data: Record<string, unknown>;
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
  'data-test-subj': dataTestSubj,
}: AlertingEpisodeGroupingTagsProps) {
  const fieldsWithValues = getNonEmptyGroupingFields(fields, data);

  if (fieldsWithValues.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
      alignItems="center"
      data-test-subj={dataTestSubj}
    >
      {fieldsWithValues.map((field) => {
        const raw = getValueByFieldPath(data, field);
        const valueText = formatGroupingValueForDisplay(raw);
        return (
          <EuiFlexItem grow={false} key={field}>
            <GroupingTagPopover field={field} valueText={valueText} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
