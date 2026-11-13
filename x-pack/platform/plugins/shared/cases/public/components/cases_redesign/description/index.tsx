/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useEuiFontSize,
} from '@elastic/eui';

import * as i18n from '../../user_actions/translations';
import { DESCRIPTION_ID } from './constants';
import { getDescriptionPreview, getDraftDescription } from './utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { EditableMarkdown, ScrollableMarkdown, useProseCss } from '../../markdown_editor';
import type { DescriptionMarkdownRefObject } from './types';
import type { CaseUI } from '../../../containers/types';
import type { OnUpdateFields } from '../../case_view/types';
import { schema } from './schema';
import { useLensDraftDescription } from './hooks/use_lens_draft_description';
import { useRegisterActivityCollapseControls } from '../user_actions/activity_collapse_context';

export type { DescriptionMarkdownRefObject } from './types';

export interface DescriptionProps {
  caseData: CaseUI;
  isLoadingDescription: boolean;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
}

export const Description = ({
  caseData,
  onUpdateField,
  isLoadingDescription,
}: DescriptionProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // The description is part of the activity column, so the column's Collapse all / Expand all owns
  // it too — a bulk control sitting directly above the largest block on the page that skipped it
  // read as broken.
  useRegisterActivityCollapseControls('description', {
    canCollapse: true,
    allCollapsed: isCollapsed,
    allExpanded: !isCollapsed,
    collapseAll: useCallback(() => setIsCollapsed(true), []),
    expandAll: useCallback(() => setIsCollapsed(false), []),
  });
  const [isEditable, setIsEditable] = useState<boolean>(false);

  const descriptionRef = useRef(null);
  const descriptionMarkdownRef = useRef<DescriptionMarkdownRefObject | null>(null);

  const { euiTheme } = useEuiTheme();
  const sFontSize = useEuiFontSize('s');
  const proseCss = useProseCss();
  const { permissions, owner } = useCasesContext();

  const { handleOnChangeEditable } = useLensDraftDescription({
    isEditable,
    setIsEditable,
    descriptionMarkdownRef,
  });

  const handleOnSave = useCallback(
    (content: string) => {
      onUpdateField({ key: DESCRIPTION_ID, value: content.trim() });
      setIsEditable(false);
    },
    [onUpdateField, setIsEditable]
  );

  const toggleCollapse = useCallback(() => setIsCollapsed((oldValue: boolean) => !oldValue), []);

  const draftDescription = useMemo(
    () => getDraftDescription(owner[0], caseData.id, DESCRIPTION_ID),
    [owner, caseData.id]
  );

  const hasUnsavedChanges = useMemo(
    () =>
      Boolean(
        draftDescription && draftDescription !== caseData.description && !isLoadingDescription
      ),
    [draftDescription, caseData.description, isLoadingDescription]
  );

  const styles = useMemo(
    () => ({
      // Chevron + title are one control: the label states what collapses, the chevron sits
      // immediately beside it rather than at the far edge of a full-width panel.
      titleButton: css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: ${euiTheme.colors.textParagraph};
        font-weight: ${euiTheme.font.weight.semiBold};
        font-size: ${sFontSize.fontSize};
        line-height: ${sFontSize.lineHeight};
        letter-spacing: 0;
      `,
      // Two clamped lines rather than one ellipsised line: a single nowrap line of a long report
      // tells the reader nothing about what they would be expanding.
      preview: css`
        color: ${euiTheme.colors.textSubdued};
        font-weight: ${euiTheme.font.weight.regular};
        font-size: ${sFontSize.fontSize};
        line-height: ${sFontSize.lineHeight};
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        /* Aligns with the expanded body's text edge so toggling doesn't shift the content. */
        padding: ${euiTheme.size.m} ${euiTheme.size.l};
      `,
      // Everything else on this page is a plain bordered panel, so a fourth bordered panel read as
      // just more chrome. The description gets figure/ground separation instead: a tinted, slightly
      // inset header band that names the region, and an accent edge tying the whole block together.
      panel: css`
        border-inline-start: ${euiTheme.border.width.thick} solid
          ${euiTheme.colors.borderStrongPrimary};
        overflow: hidden;
      `,
      header: css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        align-items: center;
        min-height: ${euiTheme.size.xxl};
        background: ${euiTheme.colors.backgroundBaseSubdued};
      `,
      headerWithBorder: css`
        border-bottom: ${euiTheme.border.thin};
      `,
      // The description is the page's primary content — it reads on the plain panel background.
      // A subdued fill here made the case's own text look like a disabled or quoted region.
      content: css`
        padding: ${euiTheme.size.m} ${euiTheme.size.l} ${euiTheme.size.l};

        > div {
          padding: 0;
        }
      `,
      unsavedDraft: css`
        padding: 0 ${euiTheme.size.l} ${euiTheme.size.l};
      `,
    }),
    [euiTheme, sFontSize]
  );

  const descriptionPreview = useMemo(
    () => getDescriptionPreview(caseData.description),
    [caseData.description]
  );

  return (
    <EuiPanel
      paddingSize="none"
      hasBorder
      hasShadow={false}
      grow={false}
      color="transparent"
      css={styles.panel}
      data-test-subj="description"
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="s"
            css={[styles.header, !isCollapsed && styles.headerWithBorder]}
          >
            <EuiFlexItem grow={false}>
              {isEditable ? (
                <EuiText
                  data-test-subj="description-title"
                  css={styles.titleButton}
                  component="span"
                >
                  {i18n.DESCRIPTION}
                </EuiText>
              ) : (
                <EuiText
                  data-test-subj="description-title"
                  css={styles.titleButton}
                  component="span"
                >
                  {i18n.DESCRIPTION}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow />
            {!isEditable ? (
              <EuiFlexItem grow={false}>
                {/* Same glyph, same corner as every comment and attachment, so one gesture reads the
                    same everywhere in the column. */}
                <EuiToolTip
                  content={isCollapsed ? i18n.EXPAND_DESCRIPTION : i18n.COLLAPSE_DESCRIPTION}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    aria-label={isCollapsed ? i18n.EXPAND_DESCRIPTION : i18n.COLLAPSE_DESCRIPTION}
                    aria-expanded={!isCollapsed}
                    iconType={isCollapsed ? 'unfold' : 'fold'}
                    onClick={toggleCollapse}
                    data-test-subj="description-collapse-icon"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
            {permissions.update && !isEditable ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.EDIT_DESCRIPTION} disableScreenReaderOutput>
                  <EuiButtonIcon
                    aria-label={i18n.EDIT_DESCRIPTION}
                    iconType="pencil"
                    onClick={() => setIsEditable(true)}
                    data-test-subj="description-edit-icon"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        {isEditable ? (
          <EuiFlexItem>
            <EditableMarkdown
              id={DESCRIPTION_ID}
              caseId={caseData.id}
              content={caseData.description}
              onChangeEditable={handleOnChangeEditable}
              onSaveContent={handleOnSave}
              editorRef={descriptionRef}
              fieldName="content"
              formSchema={schema}
              footerButtonSize="m"
              ref={descriptionMarkdownRef}
            />
          </EuiFlexItem>
        ) : (
          <>
            {isCollapsed ? (
              descriptionPreview ? (
                <EuiFlexItem>
                  <span css={styles.preview} data-test-subj="description-preview">
                    {descriptionPreview}
                  </span>
                </EuiFlexItem>
              ) : null
            ) : (
              <EuiFlexItem css={[styles.content, proseCss]}>
                <ScrollableMarkdown content={caseData.description} />
              </EuiFlexItem>
            )}
            {hasUnsavedChanges ? (
              <EuiFlexItem css={styles.unsavedDraft}>
                {/* An unsaved draft is a recovery affordance, not a footnote: it needs to be more
                    prominent than the content it is about to overwrite, and it needs a way out. */}
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="warning"
                  iconType="documentEdit"
                  title={i18n.UNSAVED_DRAFT_DESCRIPTION}
                  data-test-subj="description-unsaved-draft"
                >
                  <EuiButtonEmpty
                    size="s"
                    flush="left"
                    onClick={() => setIsEditable(true)}
                    data-test-subj="description-resume-draft"
                  >
                    {i18n.RESUME_EDITING_DESCRIPTION}
                  </EuiButtonEmpty>
                </EuiCallOut>
              </EuiFlexItem>
            ) : null}
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

Description.displayName = 'Description';
