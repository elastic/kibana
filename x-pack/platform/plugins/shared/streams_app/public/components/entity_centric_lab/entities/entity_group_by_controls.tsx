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
  EuiIcon,
  EuiLink,
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
  /**
   * Field ids shown as selected but greyed out (read-only). Used for
   * "Category" when the page is already scoped to a single category —
   * the user can see it's implicitly applied but can't toggle it.
   */
  readonly lockedFieldIds?: readonly GroupByFieldId[];
  /**
   * Visual style: `'filter'` renders the standard EuiFilterButton pill
   * (default); `'link'` renders a text link with a small dropdown caret,
   * e.g. "Group resources by: Type ▾".
   */
  readonly variant?: 'filter' | 'link';
  /**
   * Label prefix shown before the selection when `variant='link'`,
   * e.g. "Group resources by" or "Group entities by".
   */
  readonly linkPrefix?: string;
}

/**
 * "Group by" pill dropdown for the ElasticOn Inventory, mirroring the Infra
 * inventory's "Select up to two groupings" control. Clicking an unselected
 * field appends it (up to two, preserving order = level 1 then level 2);
 * clicking a selected field removes it. The trigger shows the current
 * selection so the layout is self-describing without opening the menu.
 */
export const EntityGroupByControls = ({
  fields,
  groupBy,
  onChange,
  compressed = false,
  lockedFieldIds = [],
  variant = 'filter',
  linkPrefix,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'entityCentricLabGroupBy' });

  const selectedLabels = useMemo(
    () =>
      groupBy
        .filter((id) => !lockedFieldIds.includes(id))
        .map((id) => fields.find((field) => field.id === id)?.label)
        .filter((label): label is string => Boolean(label)),
    [groupBy, fields, lockedFieldIds]
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
    const isLocked = lockedFieldIds.includes(field.id);
    const selectedIndex = groupBy.indexOf(field.id);
    const isSelected = selectedIndex !== -1 || isLocked;
    return (
      <EuiContextMenuItem
        key={field.id}
        icon={isSelected ? 'check' : 'empty'}
        disabled={isLocked || (!isSelected && atLimit)}
        onClick={() => toggle(field.id)}
        data-test-subj={`entityCentricLabGroupByOption-${field.id}`}
      >
        {field.label}
        {isSelected && !isLocked ? ` (${selectedIndex + 1})` : ''}
      </EuiContextMenuItem>
    );
  });

  const popoverContent = (
    <>
      <EuiText size="xs" color="subdued" css={{ padding: '8px 12px' }}>
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.help', {
            defaultMessage: 'Select up to two fields to group by.',
          })}
        </p>
      </EuiText>
      <EuiContextMenuPanel items={items} />
    </>
  );

  if (variant === 'link') {
    const prefix =
      linkPrefix ??
      i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.linkPrefix', {
        defaultMessage: 'Group by',
      });
    const selectionText =
      selectedLabels.length > 0 ? selectedLabels.join(', ') : i18n.translate(
        'xpack.streams.entityCentricLab.entities.groupBy.linkNone',
        { defaultMessage: 'None' }
      );
    return (
      <EuiPopover
        id={popoverId}
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        button={
          <EuiLink
            onClick={() => setIsOpen((prev) => !prev)}
            data-test-subj="entityCentricLabGroupByButton"
            css={linkTriggerCss}
          >
            {`${prefix}: ${selectionText}`}
            {' '}
            <EuiIcon type="arrowDown" size="s" />
          </EuiLink>
        }
      >
        {popoverContent}
      </EuiPopover>
    );
  }

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
        {popoverContent}
      </EuiPopover>
    </EuiFilterGroup>
  );
};

const linkTriggerCss = css`
  font-size: 14px;
  white-space: nowrap;
`;
