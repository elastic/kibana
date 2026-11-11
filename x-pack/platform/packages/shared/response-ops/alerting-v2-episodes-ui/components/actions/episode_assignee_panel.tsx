/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { useBulkGetProfiles } from '../../hooks/use_bulk_get_profiles';
import { useSuggestedProfiles } from '../../hooks/use_suggested_profiles';
import * as i18n from './translations';

/** Minimum width of the surface hosting the panel, matching the search field's usable width. */
export const EPISODE_ASSIGNEE_PANEL_WIDTH = 400;

const SUGGEST_SEARCH_DEBOUNCE_MS = 300;
const SELECTABLE_HEIGHT = 320;

interface AssigneePanelMessageProps {
  'data-test-subj': string;
  title: string;
  body: ReactNode;
}

const AssigneePanelMessage = ({
  'data-test-subj': dataTestSubj,
  title,
  body,
}: AssigneePanelMessageProps) => (
  <EuiFlexGroup
    alignItems="center"
    gutterSize="none"
    direction="column"
    justifyContent="spaceAround"
    data-test-subj={dataTestSubj}
  >
    <EuiFlexItem grow={false}>
      <EuiIcon type="user" size="xl" aria-hidden={true} />
      <EuiSpacer size="xs" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTextAlign textAlign="center">
        <EuiText size="s" color="default">
          <strong>{title}</strong>
          <br />
        </EuiText>
        <EuiText size="s" color="subdued">
          {body}
        </EuiText>
      </EuiTextAlign>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const AssigneePanelEmptyListMessage = ({ episodeCount }: { episodeCount: number }) => (
  <AssigneePanelMessage
    data-test-subj="alertingV2EditEpisodeAssigneeEmptyList"
    title={i18n.ASSIGNEE_PANEL_EMPTY_LIST_TITLE(episodeCount)}
    body={i18n.ASSIGNEE_PANEL_EMPTY_LIST_HELP}
  />
);

const AssigneePanelNoMatchesMessage = () => {
  const { docLinks } = useKibana<CoreStart>().services;

  return (
    <AssigneePanelMessage
      data-test-subj="alertingV2EditEpisodeAssigneeNoMatches"
      title={i18n.ASSIGNEE_PANEL_NO_MATCHES_USER_TITLE}
      body={
        <>
          {i18n.ASSIGNEE_PANEL_NO_MATCHES_MODIFY_SEARCH}
          <br />
          <EuiLink href={docLinks.links.cases.casesPermissions} target="_blank">
            {i18n.ASSIGNEE_PANEL_NO_MATCHES_LEARN_PRIVILEGES}
          </EuiLink>
        </>
      }
    />
  );
};

export interface EpisodeAssigneePanelProps {
  /**
   * Pre-populates the picker. Pass the row's current uid for single-episode
   * usage, or `null` for bulk where there is no shared "current" value.
   */
  assigneeUid: string | null | undefined;
  /**
   * Number of episodes the change will apply to. Drives plural copy in the
   * empty list message and, when > 1, keeps Apply enabled even if the selection
   * is unchanged from the (empty) "current" state, so the bulk path can clear
   * assignees across multiple rows. Defaults to 1.
   */
  episodeCount?: number;
  /** Id of the search input, so a hosting popover can put initial focus on it. */
  searchInputId?: string;
  /**
   * Called with the selected uid (or `null` to clear) when Apply is pressed.
   * Batching behind Apply keeps one popover session to a single write per
   * episode, instead of one per click in the list.
   */
  onApply: (uid: string | null) => void;
}

/**
 * Assignee picker shared by every surface that edits an episode assignee.
 */
export const EpisodeAssigneePanel = ({
  assigneeUid,
  episodeCount = 1,
  searchInputId,
  onApply,
}: EpisodeAssigneePanelProps) => {
  const isBulk = episodeCount > 1;
  const { userProfile, notifications } = useKibana<CoreStart>().services;
  const toasts = notifications.toasts;

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, SUGGEST_SEARCH_DEBOUNCE_MS);
  const [selectedProfile, setSelectedProfile] = useState<UserProfileWithAvatar | null>(null);
  const selectionTouchedRef = useRef(false);

  const { data: currentProfiles } = useBulkGetProfiles({
    userProfile,
    uids: assigneeUid ? [assigneeUid] : [],
    toasts,
    errorTitle: i18n.ASSIGNEE_PANEL_CURRENT_PROFILE_ERROR_TITLE,
  });

  const currentProfile = useMemo(
    () => (currentProfiles?.[0] as UserProfileWithAvatar | undefined) ?? undefined,
    [currentProfiles]
  );

  useEffect(() => {
    if (selectionTouchedRef.current || !assigneeUid || currentProfiles === undefined) {
      return;
    }
    setSelectedProfile(currentProfile ?? null);
  }, [currentProfile, currentProfiles, assigneeUid]);

  const { data: suggestions, isFetching: isSuggestLoading } = useSuggestedProfiles({
    userProfile,
    searchTerm: debouncedSearch,
    toasts,
    errorTitle: i18n.ASSIGNEE_PANEL_SUGGEST_ERROR_TITLE,
  });

  const suggestOptions = useMemo(() => {
    const suggested = (suggestions ?? []) as UserProfileWithAvatar[];
    // `UserProfilesSelectable` only displays what `options` holds, and neither the
    // current assignee nor the pending selection is guaranteed to match the search
    // term. Both are pinned to the top so the checked row stays visible and can
    // always be undone, instead of Apply committing an off-screen choice.
    const pinnedUids = new Set<string>();
    const pinned: UserProfileWithAvatar[] = [];
    for (const profile of [currentProfile, selectedProfile]) {
      if (profile && !pinnedUids.has(profile.uid)) {
        pinnedUids.add(profile.uid);
        pinned.push(profile);
      }
    }
    return [...pinned, ...suggested.filter(({ uid }) => !pinnedUids.has(uid))];
  }, [currentProfile, selectedProfile, suggestions]);

  const isApplyDisabled = useMemo(() => {
    if (assigneeUid && currentProfiles === undefined) {
      return true;
    }
    // In bulk mode there's no shared "current" assignee across the selection,
    // so any change (including clearing) is meaningful — only block while the
    // initial fetch above is pending.
    if (isBulk) {
      return false;
    }
    return (selectedProfile?.uid ?? null) === (currentProfile?.uid ?? null);
  }, [currentProfiles, currentProfile, isBulk, assigneeUid, selectedProfile]);

  const handleApply = useCallback(() => {
    onApply(selectedProfile?.uid ?? null);
  }, [onApply, selectedProfile]);

  const handleChange = useCallback((next: Array<UserProfileWithAvatar | null>) => {
    selectionTouchedRef.current = true;
    const picked = next.filter((value) => value !== null && value !== undefined);
    setSelectedProfile(picked[0] ?? null);
  }, []);

  return (
    <div data-test-subj="alertingV2EditEpisodeAssigneePanel">
      <UserProfilesSelectable<UserProfileWithAvatar | null>
        data-test-subj="alertingV2EditEpisodeAssigneeSelectable"
        searchInputId={searchInputId}
        height={SELECTABLE_HEIGHT}
        singleSelection
        selectedOptions={selectedProfile ? [selectedProfile] : []}
        options={suggestOptions}
        isLoading={isSuggestLoading}
        emptyMessage={<AssigneePanelEmptyListMessage episodeCount={episodeCount} />}
        noMatchesMessage={!isSuggestLoading ? <AssigneePanelNoMatchesMessage /> : undefined}
        onSearchChange={setSearchInput}
        onChange={handleChange}
        nullOptionLabel={i18n.ASSIGNEE_PANEL_NO_ASSIGNEE_OPTION}
        searchPlaceholder={i18n.ASSIGNEE_PANEL_SEARCH_PLACEHOLDER}
      />
      <EuiPanel color="transparent" paddingSize="s" hasShadow={false}>
        <EuiButton
          fullWidth
          size="s"
          onClick={handleApply}
          isDisabled={isApplyDisabled}
          data-test-subj="alertingV2EditEpisodeAssigneeApply"
        >
          {i18n.ASSIGNEE_PANEL_APPLY}
        </EuiButton>
      </EuiPanel>
    </div>
  );
};
