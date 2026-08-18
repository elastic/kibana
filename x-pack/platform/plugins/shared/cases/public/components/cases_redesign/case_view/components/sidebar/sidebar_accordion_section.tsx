/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiAccordion, EuiSpacer, EuiTitle, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { SectionEditBar } from '../../../../templates_v2/field_types/section_edit_bar';
import { useSectionEdit } from '../../../../templates_v2/field_types/section_edit_context';
import type { SidebarAccordionId } from './hooks/use_sidebar_accordions_state';

/**
 * A section's own inset, published as a CSS variable so content nested anywhere inside it can bleed
 * back out to the panel edges without importing from this module — which is how the template-fields
 * edit-mode background runs the full width of the panel.
 */
const SECTION_HEADER_BLOCK_SIZE = '40px';
const INLINE_PADDING_VAR = '--casesSidebarSectionInlinePadding';

interface SidebarAccordionSectionProps {
  id: SidebarAccordionId;
  title: ReactNode;
  /**
   * Optional second line of the trigger, rendered under the title and pinned with it —
   * a permanent slot for section-level context (e.g. which template a section reflects).
   */
  subtitle?: ReactNode;
  extraAction?: ReactNode;
  isOpen: boolean;
  onToggle: (id: SidebarAccordionId, isOpen: boolean) => void;
  children: ReactNode;
  /** Draws the rule separating this section from the one above it. */
  withDivider?: boolean;
  'data-test-subj'?: string;
}

export const SidebarAccordionSection: FC<SidebarAccordionSectionProps> = ({
  id,
  title,
  subtitle,
  extraAction,
  isOpen,
  onToggle,
  children,
  withDivider = false,
  'data-test-subj': dataTestSubj = 'sidebar-accordion-section',
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `case-view-sidebar-accordion-${id}` });

  const handleToggle = useCallback(
    (nextIsOpen: boolean) => {
      onToggle(id, nextIsOpen);
    },
    [id, onToggle]
  );

  const sectionEdit = useSectionEdit();
  const isEditing = sectionEdit?.isEditing === true;

  const styles = useMemo(
    () => ({
      // Each section owns its own padding rather than inheriting one inset from the panel, so a
      // section can tint or rule itself edge to edge (see the bleed below and the edit-mode
      // background) instead of stopping short of the panel border.
      section: css({
        [INLINE_PADDING_VAR]: euiTheme.size.l,
        paddingInline: `var(${INLINE_PADDING_VAR})`,
        paddingBlock: euiTheme.size.m,
        borderBlockStart: withDivider ? euiTheme.border.thin : undefined,
      }),
      accordion: css({
        // The title stays put while its own fields scroll under it, so a long section never leaves
        // the reader without a label. Bleeding to the panel edges stops content from being visible
        // in the gutter beside the pinned row.
        '& > .euiAccordion__triggerWrapper': {
          position: 'sticky',
          insetBlockStart: 0,
          zIndex: 2,
          minBlockSize: SECTION_HEADER_BLOCK_SIZE,
          marginInline: `calc(-1 * var(${INLINE_PADDING_VAR}))`,
          paddingInline: `var(${INLINE_PADDING_VAR})`,
          // The gap between the header and the first field belongs to the pinned band, not to the
          // scrolling content: a spacer below the trigger scrolls away with the fields, letting
          // rows butt against the subtitle's baseline once the header is stuck. Carrying the same
          // gap as opaque padding keeps the resting layout identical while guaranteeing the
          // clearance survives scrolling. Only while open — a collapsed section has no content
          // below its title to hold clear of.
          paddingBlockEnd: isOpen && !isEditing ? euiTheme.size.m : undefined,
          // Editing turns the header into a tinted band while the fields below stay on the panel's
          // normal surface — the inverse of tinting the body, and the only pairing that holds up in
          // both colour modes: `backgroundBaseHighlighted` resolves to the *same* value as
          // `backgroundBaseSubdued` in light mode, so a "one step stronger" grey is invisible there.
          // Neutral rather than a hue, so the band competes with neither the primary Save button
          // inside it nor the warning markers on the changed fields below.
          background: isEditing
            ? euiTheme.colors.backgroundBaseSubdued
            : euiTheme.colors.backgroundBasePlain,
        },
        // Let the trigger shrink below its content so a long subtitle (e.g. a template name)
        // can truncate with an ellipsis instead of widening the header past the panel. The
        // buttonContent wrapper is a span, so it also needs a block context for truncation.
        '& > .euiAccordion__triggerWrapper > .euiAccordion__button': {
          minInlineSize: 0,
        },
        '& .euiAccordion__buttonContent': {
          display: 'block',
          minInlineSize: 0,
        },
      }),
      // In edit mode the save row becomes a second line of the header. `extraAction` is the only slot
      // EuiAccordion exposes inside its trigger wrapper, and the trigger wrapper is the only part of
      // an accordion that can stay pinned — so the wrapper is re-laid-out as a two-row grid to put
      // the row there without reimplementing the trigger. A grid rather than `flex-wrap`: with wrap,
      // the full-width action slot also pushed the title button onto its own line, leaving the
      // disclosure arrow stranded on a row by itself.
      editingAccordion: css({
        '& > .euiAccordion__triggerWrapper': {
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          gridTemplateAreas: '"arrow title" "actions actions"',
          alignItems: 'center',
          columnGap: euiTheme.size.xs,
          // The section's own top padding moves in here while editing (see `editingSection`), so the
          // header's surface starts flush against the divider above it instead of leaving a band of
          // untinted section showing between the rule and the header.
          paddingBlockStart: euiTheme.size.m,
          // Closes the pinned header with a full-bleed rule and breathing room, so the save row
          // reads as the end of the header rather than dissolving into the first field below it.
          paddingBlockEnd: euiTheme.size.s,
          borderBlockEnd: euiTheme.border.thin,
        },
        '& > .euiAccordion__triggerWrapper > .euiAccordion__arrow': { gridArea: 'arrow' },
        '& > .euiAccordion__triggerWrapper > .euiAccordion__button': {
          gridArea: 'title',
          minInlineSize: 0,
        },
        '& > .euiAccordion__triggerWrapper > .euiAccordion__optionalAction': {
          gridArea: 'actions',
          marginInlineStart: 0,
        },
      }),
      // The fields keep the panel's normal surface while editing; the tinted header band above them
      // is what marks the mode. The section hands its top padding to that band so the band's surface
      // starts at the divider instead of leaving an untinted strip above it.
      editingSection: css({
        paddingBlockStart: 0,
      }),
    }),
    [euiTheme, withDivider, isEditing, isOpen]
  );

  return (
    <div
      css={[styles.section, isEditing ? styles.editingSection : undefined]}
      data-test-subj={`${dataTestSubj}-container`}
    >
      <EuiAccordion
        id={accordionId}
        css={[styles.accordion, isEditing ? styles.editingAccordion : undefined]}
        data-test-subj={dataTestSubj}
        buttonProps={{ 'data-test-subj': `${dataTestSubj}-toggle` }}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={handleToggle}
        // While editing, the save row replaces the section's settings action: the reader is part-way
        // through a change, and a settings popover alongside an unsaved-count is a second, competing
        // exit from a state that already has two.
        extraAction={
          isEditing && sectionEdit ? (
            <SectionEditBar
              changedCount={sectionEdit.changedCount}
              isSaving={sectionEdit.isSaving}
              onCancel={sectionEdit.cancelEdit}
              onSave={sectionEdit.saveEdits}
            />
          ) : (
            extraAction
          )
        }
        buttonContent={
          <>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
            {subtitle}
          </>
        }
      >
        {/* While editing, the header closes with a rule (see `editingAccordion`), so the gap below
            it returns to the content; otherwise the pinned band carries it as padding. */}
        {isEditing ? <EuiSpacer size="m" /> : null}
        {children}
      </EuiAccordion>
    </div>
  );
};

SidebarAccordionSection.displayName = 'SidebarAccordionSection';
