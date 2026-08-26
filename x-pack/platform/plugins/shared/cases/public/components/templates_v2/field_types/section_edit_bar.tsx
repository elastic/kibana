/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';

interface SectionEditBarProps {
  changedCount: number;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Bottom bar for a sidebar section in edit mode: how much is unsaved on the left, the way out on the
 * right. The wording stays terse because the sidebar is only a few hundred pixels wide — "2 unsaved"
 * has to fit beside both buttons without wrapping.
 */
export const SectionEditBar: FC<SectionEditBarProps> = ({
  changedCount,
  isSaving,
  onCancel,
  onSave,
}) => {
  const { euiTheme } = useEuiTheme();

  const barStyles = useMemo(
    () =>
      css({
        // A second line of the section header, so it pins with the header rather than scrolling away.
        // No background of its own — it sits on the section's edit-mode surface and reads as part of
        // it rather than as a band laid over it.
        inlineSize: '100%',
        marginBlockStart: euiTheme.size.s,
        paddingBlockStart: euiTheme.size.s,
        borderBlockStart: euiTheme.border.thin,
      }),
    [euiTheme]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="xs"
      responsive={false}
      css={barStyles}
      data-test-subj="section-edit-bar"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="section-edit-changed-count">
          {i18n.UNSAVED_FIELD_CHANGES(changedCount)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            {/* Same size as Save: two actions sitting side by side at different scales read as a
                mistake, and the secondary one still recedes by being empty rather than filled. */}
            <EuiButtonEmpty
              size="s"
              onClick={onCancel}
              isDisabled={isSaving}
              data-test-subj="section-edit-cancel"
            >
              {i18n.SECTION_EDIT_CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              onClick={onSave}
              isLoading={isSaving}
              isDisabled={changedCount === 0}
              data-test-subj="section-edit-save"
            >
              {i18n.SECTION_EDIT_SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SectionEditBar.displayName = 'SectionEditBar';

/** Shared visual treatment for a sidebar section that is in edit mode. */
export const useSectionEditingStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () =>
      // Edit mode is a mode, so it looks like one — but the separation is carried by the tinted
      // surface alone. A leading edge here read as a per-field marker, competing with the yellow
      // edge that actually marks a changed field.
      //
      // The tint bleeds back out through the section's own inset so it runs the full width of the
      // panel; stopping short of the panel border made it read as a nested card rather than a mode.
      css({
        background: euiTheme.colors.backgroundBaseSubdued,
        marginInline: `calc(-1 * var(--casesSidebarSectionInlinePadding, 0px))`,
        paddingInline: `var(--casesSidebarSectionInlinePadding, 0px)`,
        paddingBlock: euiTheme.size.s,
      }),
    [euiTheme]
  );
};

/**
 * Shared marker for a single changed field inside a section in edit mode: an amber bar down its
 * leading edge and an amber dot beside its label.
 *
 * Both are lifted from Advanced Settings' unsaved-field treatment (`field_row.styles.ts` uses the
 * same `box-shadow: -size.xs 0 colors.warning`, and `title/icon_unsaved.tsx` the same warning dot),
 * so an unsaved field looks the same here as it does everywhere else in Kibana. The dot is drawn in
 * CSS rather than composed as an `EuiIconTip` because each field type renders its own label, and
 * there is no seam to inject a node into — `ModifiedFieldAnnouncement` carries the same information
 * to assistive tech.
 */
export const useFieldMarkerStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      // The bar is a real border inside the row's own box, and the space for it is reserved on every
      // row. Advanced Settings can hang its bar outside the row with a negative offset; here it
      // cannot — EuiAccordion's child wrapper is `overflow: hidden` for its open/close animation, so
      // an outside-the-box bar (a left box-shadow, or an overhang from a negative margin) is clipped
      // away entirely. Reserving the space on unmodified rows too keeps a field from jumping sideways
      // the moment it is edited.
      row: css({
        borderInlineStart: `${euiTheme.size.xs} solid transparent`,
        paddingInlineStart: euiTheme.size.s,
      }),
      modified: css({
        borderInlineStartColor: euiTheme.colors.warning,
        '& .euiFormLabel::after': {
          content: '""',
          display: 'inline-block',
          inlineSize: euiTheme.size.s,
          blockSize: euiTheme.size.s,
          marginInlineStart: euiTheme.size.xs,
          borderRadius: '50%',
          backgroundColor: euiTheme.colors.warning,
          verticalAlign: 'baseline',
        },
      }),
    }),
    [euiTheme]
  );
};

/** The screen-reader equivalent of the amber bar and dot. */
export const ModifiedFieldAnnouncement: FC = () => (
  <EuiScreenReaderOnly>
    <span>{i18n.FIELD_MODIFIED}</span>
  </EuiScreenReaderOnly>
);

ModifiedFieldAnnouncement.displayName = 'ModifiedFieldAnnouncement';
