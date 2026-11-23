/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInlineEditTitle,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { MAX_TITLE_LENGTH } from '../../../../common/constants';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useGetTags } from '../../../containers/use_get_tags';
import { useUpdateRecord } from '../../hooks';
import { ICONS } from '../../icons';
import * as i18n from './translations';

const MAX_VISIBLE_TAGS = 3;

const toOption = (label: string): EuiComboBoxOptionOption<string> => ({ label });

export interface TitleTagsControlProps {
  record: InvestigationRecord;
  isDisabled?: boolean;
}

/** The investigation title: the case title, edited in place with the Enter key or the check mark. */
export const EditableTitle: React.FC<TitleTagsControlProps> = ({ record, isDisabled = false }) => {
  const { mutateAsync: updateRecord } = useUpdateRecord(record.id, {
    successMessage: i18n.TITLE_SAVED,
  });
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (value: string): Promise<boolean> => {
      const title = value.trim();
      if (title.length === 0) {
        setError(i18n.TITLE_REQUIRED);
        return false;
      }
      if (title.length > MAX_TITLE_LENGTH) {
        setError(i18n.TITLE_TOO_LONG(MAX_TITLE_LENGTH));
        return false;
      }
      if (title === record.title) {
        setError(undefined);
        return true;
      }
      setIsSaving(true);
      try {
        await updateRecord({ title });
        setError(undefined);
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [record.title, updateRecord]
  );

  return (
    <EuiInlineEditTitle
      key={record.title}
      heading="h1"
      size="m"
      defaultValue={record.title}
      inputAriaLabel={i18n.TITLE_ARIA}
      isReadOnly={isDisabled}
      isInvalid={error !== undefined}
      isLoading={isSaving}
      onSave={save}
      onCancel={() => setError(undefined)}
      editModeProps={{
        formRowProps: { error, isInvalid: error !== undefined, fullWidth: true },
        inputProps: {
          maxLength: MAX_TITLE_LENGTH + 40,
          'data-test-subj': 'investigationTitleInput',
        },
        saveButtonProps: { 'data-test-subj': 'investigationTitleSave' },
        cancelButtonProps: { 'data-test-subj': 'investigationTitleCancel' },
      }}
      readModeProps={{
        css: css`
          max-inline-size: 100%;
          text-align: start;
          white-space: normal;
          overflow-wrap: anywhere;
          block-size: auto;
        `,
        title: record.title,
        'data-test-subj': 'investigationTitleEdit',
      }}
      data-test-subj="investigationTitle"
    />
  );
};
EditableTitle.displayName = 'EditableTitle';

interface TagsEditorProps {
  tags: string[];
  isSaving: boolean;
  onSave: (tags: string[]) => void;
  onCancel: () => void;
}

const TagsEditor: React.FC<TagsEditorProps> = ({
  tags: initialTags,
  isSaving,
  onSave,
  onCancel,
}) => {
  const { euiTheme } = useEuiTheme();
  const { data: knownTags, isLoading } = useGetTags();
  const [tags, setTags] = useState<string[]>(initialTags);
  const options = useMemo(() => (knownTags ?? []).map(toOption), [knownTags]);
  const { maxTagLength, maxTags } = INVESTIGATION_LIMITS;
  const error = tags.some((tag) => tag.length > maxTagLength)
    ? i18n.TAGS_TOO_LONG(maxTagLength)
    : tags.length > maxTags
    ? i18n.TAGS_TOO_MANY(maxTags)
    : undefined;

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed.length > 0 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
  };

  return (
    <div
      css={css`
        inline-size: 20rem;
        max-inline-size: 80vw;
      `}
    >
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          margin-block-end: ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{i18n.TAGS}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={onCancel} data-test-subj="investigationTagsCancel">
                {i18n.TAGS_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={isSaving}
                isDisabled={error !== undefined}
                onClick={() => onSave(tags)}
                data-test-subj="investigationTagsSave"
              >
                {i18n.TAGS_SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFormRow fullWidth isInvalid={error !== undefined} error={error}>
        <EuiComboBox
          fullWidth
          isLoading={isLoading}
          placeholder={i18n.TAGS_PLACEHOLDER}
          options={options}
          selectedOptions={tags.map(toOption)}
          onCreateOption={addTag}
          onChange={(selected) => setTags(selected.map(({ label }) => label))}
          isInvalid={error !== undefined}
          aria-label={i18n.TAGS}
          data-test-subj="investigationTagsInput"
        />
      </EuiFormRow>
    </div>
  );
};
TagsEditor.displayName = 'TagsEditor';

/** The investigation tags (the case tags): the first few as badges, the rest in a tooltip, and a pencil to edit. */
export const TagsControl: React.FC<TitleTagsControlProps> = ({ record, isDisabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: updateRecord, isLoading } = useUpdateRecord(record.id, {
    successMessage: i18n.TAGS_SAVED,
  });
  const { tags } = record;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const hidden = tags.slice(MAX_VISIBLE_TAGS);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      data-test-subj="investigationTags"
    >
      {tags.length === 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="investigationTagsEmpty">
            {i18n.TAGS_NONE}
          </EuiText>
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup gutterSize="xs">
            {visible.map((tag) => (
              <EuiToolTip key={tag} content={tag} disableScreenReaderOutput>
                <EuiBadge
                  color="hollow"
                  tabIndex={0}
                  css={css`
                    max-inline-size: 10rem;
                  `}
                  data-test-subj="investigationTag"
                >
                  {tag}
                </EuiBadge>
              </EuiToolTip>
            ))}
            {hidden.length > 0 ? (
              <EuiToolTip content={hidden.join(', ')} disableScreenReaderOutput>
                <EuiBadge color="hollow" tabIndex={0} data-test-subj="investigationTagsMore">
                  {i18n.TAGS_MORE(hidden.length)}
                </EuiBadge>
              </EuiToolTip>
            ) : null}
          </EuiBadgeGroup>
        </EuiFlexItem>
      )}
      {isDisabled ? null : (
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            anchorPosition="downLeft"
            panelPaddingSize="s"
            aria-label={i18n.TAGS_EDIT}
            button={
              <EuiToolTip content={i18n.TAGS_EDIT} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.edit}
                  size="xs"
                  color="text"
                  aria-label={i18n.TAGS_EDIT}
                  onClick={() => setIsOpen((open) => !open)}
                  data-test-subj="investigationTagsEdit"
                />
              </EuiToolTip>
            }
          >
            <TagsEditor
              tags={tags}
              isSaving={isLoading}
              onCancel={() => setIsOpen(false)}
              onSave={(next) => updateRecord({ tags: next }, { onSuccess: () => setIsOpen(false) })}
            />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
TagsControl.displayName = 'TagsControl';
