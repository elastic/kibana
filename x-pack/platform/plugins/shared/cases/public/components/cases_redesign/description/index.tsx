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
  EuiIcon,
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
        padding: 0 ${euiTheme.size.m} ${euiTheme.size.m};
      `,
      header: css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        align-items: center;
        min-height: ${euiTheme.size.xxl};
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
        padding: 0 ${euiTheme.size.m} ${euiTheme.size.m};
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
                <EuiText data-test-subj="description-title" css={styles.titleButton} component="span">
                  {i18n.DESCRIPTION}
                </EuiText>
              ) : (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? i18n.EXPAND_DESCRIPTION : i18n.COLLAPSE_DESCRIPTION}
                  data-test-subj="description-collapse-icon"
                  css={styles.titleButton}
                >
                  <EuiIcon type={isCollapsed ? 'arrowRight' : 'arrowDown'} size="s" />
                  <span data-test-subj="description-title">{i18n.DESCRIPTION}</span>
                </button>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow />
            {permissions.update && !isEditable ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.EDIT_DESCRIPTION} disableScreenReaderOutput>
                  <EuiButtonIcon
                    aria-label={i18n.EDIT_DESCRIPTION}
                    iconType="pencil"
                    color="text"
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
