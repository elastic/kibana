/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import * as i18n from '../../user_actions/translations';
import { getDescriptionPreview, getDraftDescription } from './utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { EditableMarkdown, ScrollableMarkdown } from '../../markdown_editor';
import type { DescriptionMarkdownRefObject } from './types';
import type { CaseUI } from '../../../containers/types';
import type { OnUpdateFields } from '../../case_view/types';
import { schema } from './schema';
import { useLensDraftDescription } from './hooks/use_lens_draft_description';
import { useDescriptionStyles } from './hooks/use_description_styles';

export type { DescriptionMarkdownRefObject } from './types';

const DESCRIPTION_ID = 'description';

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

  const toggleCollapse = () => setIsCollapsed((oldValue: boolean) => !oldValue);

  const draftDescription = getDraftDescription(owner[0], caseData.id, DESCRIPTION_ID);

  const hasUnsavedChanges = Boolean(
    draftDescription && draftDescription !== caseData.description && !isLoadingDescription
  );

  const styles = useDescriptionStyles();

  const descriptionPreview = useMemo(
    () => getDescriptionPreview(caseData.description),
    [caseData.description]
  );

  return (
    <EuiPanel
      paddingSize="none"
      hasBorder={false}
      hasShadow={false}
      color="transparent"
      data-test-subj="description"
    >
      <EuiFlexGroup direction="column" gutterSize={isEditable ? 'none' : 's'}>
        <EuiFlexItem>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="s"
            css={styles.header}
          >
            <EuiFlexItem grow={false}>
              <EuiText data-test-subj="description-title" css={styles.title}>
                {i18n.DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
            {isCollapsed && !isEditable && descriptionPreview ? (
              <EuiFlexItem grow>
                <span css={styles.preview} data-test-subj="description-preview">
                  {descriptionPreview}
                </span>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  {permissions.update && !isEditable ? (
                    <EuiToolTip content={i18n.EDIT_DESCRIPTION} disableScreenReaderOutput>
                      <EuiButtonIcon
                        aria-label={i18n.EDIT_DESCRIPTION}
                        iconType="pencil"
                        color="text"
                        onClick={() => setIsEditable(true)}
                        data-test-subj="description-edit-icon"
                        css={styles.editIcon}
                      />
                    </EuiToolTip>
                  ) : null}
                </EuiFlexItem>
                {!isEditable ? (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={isCollapsed ? i18n.EXPAND_DESCRIPTION : i18n.COLLAPSE_DESCRIPTION}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        aria-label={
                          isCollapsed ? i18n.EXPAND_DESCRIPTION : i18n.COLLAPSE_DESCRIPTION
                        }
                        iconType={isCollapsed ? 'arrowRight' : 'arrowDown'}
                        onClick={toggleCollapse}
                        data-test-subj="description-collapse-icon"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
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
            {!isCollapsed ? (
              <EuiFlexItem css={styles.content}>
                <ScrollableMarkdown content={caseData.description} />
              </EuiFlexItem>
            ) : null}
            {hasUnsavedChanges ? (
              <EuiFlexItem css={styles.unsavedDraft}>
                <EuiText color="subdued" size="xs" data-test-subj="description-unsaved-draft">
                  {i18n.UNSAVED_DRAFT_DESCRIPTION}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

Description.displayName = 'Description';
