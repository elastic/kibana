/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { GroupByFieldDef, GroupByFieldId } from './entity_group_by';

// Match the other toolbar facet groups — don't absorb the row's free space.
const NO_GROW = css`
  flex-grow: 0;
`;

const MAX_GROUPINGS = 2;

interface Props {
  /** All fields offered in the dropdown (scoped to the current category). */
  readonly fields: readonly GroupByFieldDef[];
  /** Active grouping, in order (level 1 then level 2). */
  readonly groupBy: readonly GroupByFieldId[];
  readonly onChange: (next: GroupByFieldId[]) => void;
  /** Render at the compact (32px) filter height to line up with the search bar. */
  readonly compressed?: boolean;
}

/**
 * "Group by" pill dropdown for the ElasticOn Inventory, mirroring the Infra
 * inventory's "Select up to two groupings" control. Clicking an unselected
 * field appends it (up to two, preserving order = level 1 then level 2);
 * clicking a selected field removes it. The trigger shows the current
 * selection so the layout is self-describing without opening the menu.
 */
export const EntityGroupByControls = ({ fields, groupBy, onChange, compressed = false }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'entityCentricLabGroupBy' });

  const selectedLabels = useMemo(
    () =>
      groupBy
        .map((id) => fields.find((field) => field.id === id)?.label)
        .filter((label): label is string => Boolean(label)),
    [groupBy, fields]
  );

  const toggle = (id: GroupByFieldId) => {
    const isSelected = groupBy.includes(id);
    if (isSelected) {
      onChange(groupBy.filter((selected) => selected !== id));
      return;
    }
    if (groupBy.length >= MAX_GROUPINGS) return;
    onChange([...groupBy, id]);
  };

  const atLimit = groupBy.length >= MAX_GROUPINGS;

  const items = fields.map((field) => {
    const selectedIndex = groupBy.indexOf(field.id);
    const isSelected = selectedIndex !== -1;
    return (
      <EuiContextMenuItem
        key={field.id}
        icon={isSelected ? 'check' : 'empty'}
        disabled={!isSelected && atLimit}
        onClick={() => toggle(field.id)}
        data-test-subj={`entityCentricLabGroupByOption-${field.id}`}
      >
        {field.label}
        {isSelected ? ` (${selectedIndex + 1})` : ''}
      </EuiContextMenuItem>
    );
  });

  const buttonLabel =
    selectedLabels.length > 0
      ? i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.buttonWithSelection', {
          defaultMessage: 'Group by: {selection}',
          values: { selection: selectedLabels.join(', ') },
        })
      : i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.button', {
          defaultMessage: 'Group by',
        });

  return (
    <EuiFilterGroup compressed={compressed} css={NO_GROW}>
      <EuiPopover
        id={popoverId}
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            isSelected={isOpen}
            hasActiveFilters={groupBy.length > 0}
            numActiveFilters={groupBy.length}
            onClick={() => setIsOpen((prev) => !prev)}
            data-test-subj="entityCentricLabGroupByButton"
          >
            {buttonLabel}
          </EuiFilterButton>
        }
      >
        <EuiText size="xs" color="subdued" css={{ padding: '8px 12px' }}>
          <p>
            {i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.help', {
              defaultMessage: 'Select up to two fields to group by.',
            })}
          </p>
        </EuiText>
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
