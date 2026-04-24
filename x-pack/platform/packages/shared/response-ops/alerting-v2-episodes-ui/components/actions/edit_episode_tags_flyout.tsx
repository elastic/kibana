/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiSelectable, EuiSpacer, useEuiTheme } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { MAX_TAG_LENGTH, MAX_TAGS_PER_EPISODE } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';
import { useFetchAlertEpisodeTagSuggestions } from '../../hooks/use_fetch_alert_episode_tag_suggestions';
import { EpisodeTagsFlyoutActionBar } from './episode_tags_flyout_action_bar';
import { EpisodeActionFlyout, EpisodeActionFlyoutFooter } from './episode_action_flyout_layout';
import * as i18n from './translations';

const NEW_KEY_PREFIX = '__new__:';

function tagValueFromOptionKey(key: string): string {
  return key.startsWith(NEW_KEY_PREFIX) ? key.slice(NEW_KEY_PREFIX.length) : key;
}

export interface AlertEpisodeTagsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  groupHash: string;
  currentTags: string[];
  http: HttpStart;
  services: { expressions: ExpressionsStart };
}

export function AlertEpisodeTagsFlyout({
  onClose,
  groupHash,
  currentTags,
  http,
  services,
}: AlertEpisodeTagsFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const [searchValue, setSearchValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const { data: suggestionTags = [], isLoading: isLoadingSuggestions } =
    useFetchAlertEpisodeTagSuggestions({
      services,
    });
  const { mutate: createAlertAction, isLoading: isSaving } = useCreateAlertAction(http);

  const allKnownTags = useMemo(() => {
    const merged = new Set<string>([...suggestionTags, ...currentTags, ...selectedTags]);
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [suggestionTags, currentTags, selectedTags]);

  const trimmedSearch = searchValue.trim();
  const atTagCountLimit = selectedTags.length >= MAX_TAGS_PER_EPISODE;

  const canAddNew =
    trimmedSearch.length > 0 &&
    trimmedSearch.length <= MAX_TAG_LENGTH &&
    !allKnownTags.some((t) => t === trimmedSearch) &&
    selectedTags.length < MAX_TAGS_PER_EPISODE;

  const tagsForSelectAll = useMemo(() => {
    const next = new Set(allKnownTags);
    if (canAddNew) {
      next.add(trimmedSearch);
    }
    const sorted = [...next].sort((a, b) => a.localeCompare(b));
    return sorted.slice(0, MAX_TAGS_PER_EPISODE);
  }, [allKnownTags, canAddNew, trimmedSearch]);

  const tagTooLong = useMemo(
    () =>
      trimmedSearch.length > MAX_TAG_LENGTH || selectedTags.some((t) => t.length > MAX_TAG_LENGTH),
    [trimmedSearch, selectedTags]
  );

  const tooManyTags = useMemo(() => selectedTags.length > MAX_TAGS_PER_EPISODE, [selectedTags]);
  const tooManyTagsWarning = useMemo(
    () => selectedTags.length === MAX_TAGS_PER_EPISODE,
    [selectedTags]
  );

  const selectableOptions: EuiSelectableOption[] = useMemo(() => {
    const base = allKnownTags.map((tag) => ({
      key: tag,
      label: tag,
      checked: selectedTags.includes(tag) ? ('on' as const) : undefined,
      disabled: atTagCountLimit && !selectedTags.includes(tag),
      'data-test-subj': `alertingEpisodeTagsFlyout-option-${tag}`,
    }));

    if (!canAddNew) {
      return base;
    }

    return [
      {
        key: `${NEW_KEY_PREFIX}${trimmedSearch}`,
        label: i18n.getTagsActionAddNewOptionLabel(trimmedSearch),
        checked: selectedTags.includes(trimmedSearch) ? ('on' as const) : undefined,
        disabled: atTagCountLimit && !selectedTags.includes(trimmedSearch),
        'data-test-subj': 'alertingEpisodeTagsFlyout-addNewOption',
      },
      ...base,
    ];
  }, [allKnownTags, selectedTags, canAddNew, trimmedSearch, atTagCountLimit]);

  const handleSelectableChange = useCallback((newOptions: EuiSelectableOption[]) => {
    setSelectedTags(
      newOptions.filter((o) => o.checked === 'on').map((o) => tagValueFromOptionKey(String(o.key)))
    );
  }, []);

  const saveBlocked = tagTooLong || tooManyTags;

  const handleSave = useCallback(() => {
    if (saveBlocked) {
      return;
    }
    createAlertAction(
      {
        groupHash,
        actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
        body: { tags: selectedTags },
      },
      { onSuccess: onClose }
    );
  }, [createAlertAction, groupHash, onClose, saveBlocked, selectedTags]);

  return (
    <EpisodeActionFlyout
      onClose={onClose}
      dataTestSubj="alertingEpisodeTagsFlyout"
      ariaLabelledBy="alertingEpisodeTagsFlyoutTitle"
      titleId="alertingEpisodeTagsFlyoutTitle"
      title={i18n.TAGS_ACTION_FLYOUT_TITLE}
      titleDataTestSubj="alertingEpisodeTagsFlyoutTitle"
      footer={
        <EpisodeActionFlyoutFooter
          onClose={onClose}
          onPrimaryClick={handleSave}
          cancelLabel={i18n.TAGS_ACTION_CANCEL}
          primaryLabel={i18n.TAGS_ACTION_SAVE}
          cancelTestSubj="alertingEpisodeTagsFlyoutCancel"
          primaryTestSubj="alertingEpisodeTagsFlyoutSave"
          isPrimaryLoading={isSaving}
          isPrimaryDisabled={saveBlocked}
        />
      }
    >
      {isLoadingSuggestions ? (
        <EuiLoadingSpinner size="l" data-test-subj="alertingEpisodeTagsFlyoutLoading" />
      ) : (
        <EuiSelectable
          options={selectableOptions}
          searchable
          searchProps={{
            value: searchValue,
            onChange: setSearchValue,
            placeholder: i18n.TAGS_ACTION_SEARCH_PLACEHOLDER,
            'data-test-subj': 'alertingEpisodeTagsFlyoutSearch',
          }}
          onChange={handleSelectableChange}
          emptyMessage={i18n.TAGS_ACTION_EMPTY_TAGS}
          noMatchesMessage={i18n.TAGS_ACTION_NO_MATCHES}
          data-test-subj="alertingEpisodeTagsFlyoutSelectable"
          height={360}
        >
          {(list, search) => (
            <>
              {search}
              <EpisodeTagsFlyoutActionBar
                euiTheme={euiTheme}
                totalTagCount={allKnownTags.length}
                selectedCount={selectedTags.length}
                onSelectAll={() => setSelectedTags(tagsForSelectAll)}
                onSelectNone={() => setSelectedTags([])}
              />
              {list}
            </>
          )}
        </EuiSelectable>
      )}
      {tagTooLong ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            title={i18n.TAGS_ACTION_TAG_TOO_LONG_TITLE}
            color="danger"
            iconType="error"
            data-test-subj="alertingEpisodeTagsFlyoutTagTooLongError"
          >
            <p>{i18n.getTagsActionTagTooLongBody(MAX_TAG_LENGTH)}</p>
          </EuiCallOut>
        </>
      ) : null}
      {tooManyTagsWarning ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            title={i18n.TAGS_ACTION_TOO_MANY_TAGS_TITLE}
            color="warning"
            iconType="warning"
            data-test-subj="alertingEpisodeTagsFlyoutTooManyTagsWarning"
          >
            <p>{i18n.getTagsActionTooManyTagsBody(MAX_TAGS_PER_EPISODE)}</p>
          </EuiCallOut>
        </>
      ) : null}
    </EpisodeActionFlyout>
  );
}
