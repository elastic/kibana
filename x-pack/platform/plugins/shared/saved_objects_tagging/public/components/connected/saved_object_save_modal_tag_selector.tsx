/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiFormRow, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObjectSaveModalTagSelectorComponentProps } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { i18n } from '@kbn/i18n';
import type { TagsCapabilities } from '../../../common';
import { TagSelector } from '../base';
import type { ITagsCache } from '../../services';
import type { CreateModalOpener } from '../edition_modal';

interface GetConnectedTagSelectorOptions {
  cache: ITagsCache;
  capabilities: TagsCapabilities;
  openCreateModal: CreateModalOpener;
}

export const getConnectedSavedObjectModalTagSelectorComponent = ({
  cache,
  capabilities,
  openCreateModal,
}: GetConnectedTagSelectorOptions): FC<SavedObjectSaveModalTagSelectorComponentProps> => {
  return ({
    initialSelection,
    onTagsSelected: notifySelectionChange,
    markOptional,
    ...rest
  }: SavedObjectSaveModalTagSelectorComponentProps) => {
    const tags = useObservable(cache.getState$(), cache.getState());
    const [selected, setSelected] = useState<string[]>(initialSelection);
    const [searchValue, setSearchValue] = useState('');
    const [touched, setTouched] = useState(false);

    const normalizedSearchValue = searchValue.trim().toLowerCase();

    const exactTagMatch = !!normalizedSearchValue
      ? tags.find((tag) => tag.name.toLowerCase() === normalizedSearchValue)
      : undefined;

    const isTagAlreadyCreated = !!exactTagMatch;
    const isTagAlreadySelected = isTagAlreadyCreated && selected.includes(exactTagMatch.id);
    const noMatchingTag = !!normalizedSearchValue && !isTagAlreadyCreated;
    const isInvalid = touched && (noMatchingTag || isTagAlreadyCreated || isTagAlreadySelected);

    const getErrorMessage = () => {
      if (isTagAlreadySelected) {
        return i18n.translate('xpack.savedObjectsTagging.uiApi.saveModal.alreadySelectedHint', {
          defaultMessage: 'Tag "{searchValue}" is already selected.',
          values: { searchValue },
        });
      }
      if (isTagAlreadyCreated) {
        return i18n.translate('xpack.savedObjectsTagging.uiApi.saveModal.exactTagMatchHint', {
          defaultMessage: 'Tag "{searchValue}" already exists. Select it from the existing tags.',
          values: { searchValue },
        });
      }
      return capabilities.create
        ? i18n.translate('xpack.savedObjectsTagging.uiApi.saveModal.noMatchingTagCreateHint', {
            defaultMessage:
              'No tags match "{searchValue}". Select an existing tag or create a new one.',
            values: { searchValue },
          })
        : i18n.translate('xpack.savedObjectsTagging.uiApi.saveModal.noMatchingTagHint', {
            defaultMessage: 'No tags match "{searchValue}".',
            values: { searchValue },
          });
    };

    const setSelectedInternal = useCallback(
      (newSelection: string[]) => {
        setSelected(newSelection);
        notifySelectionChange(newSelection);
      },
      [notifySelectionChange]
    );

    return (
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.savedObjectsTagging.uiApi.saveModal.label"
            defaultMessage="Tags"
          />
        }
        labelAppend={
          markOptional && (
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                id="xpack.savedObjectsTagging.uiApi.saveModal.optional"
                defaultMessage="Optional"
              />
            </EuiText>
          )
        }
        isInvalid={isInvalid}
        error={isInvalid ? getErrorMessage() : undefined}
      >
        <TagSelector
          selected={selected}
          onTagsSelected={setSelectedInternal}
          tags={tags}
          data-test-subj="savedObjectTagSelector"
          allowCreate={capabilities.create}
          openCreateModal={openCreateModal}
          onSearchChange={setSearchValue}
          onBlur={() => setTouched(true)}
          isInvalid={isInvalid}
          {...rest}
        />
      </EuiFormRow>
    );
  };
};
