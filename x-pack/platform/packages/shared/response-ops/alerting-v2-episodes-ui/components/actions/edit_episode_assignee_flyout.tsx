/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { useBulkGetProfiles } from '../../hooks/use_bulk_get_profiles';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';
import { useSuggestedProfiles } from '../../hooks/use_suggested_profiles';
import { EpisodeActionFlyout, EpisodeActionFlyoutFooter } from './episode_action_flyout_layout';
import * as i18n from './translations';

function AssigneeFlyoutEmptyListMessage() {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      direction="column"
      justifyContent="spaceAround"
      data-test-subj="alertingV2EditEpisodeAssigneeEmptyList"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="user" size="xl" aria-hidden={true} />
        <EuiSpacer size="xs" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTextAlign textAlign="center">
          <EuiText size="s" color="default">
            <strong>{i18n.ASSIGNEE_FLYOUT_EMPTY_LIST_TITLE}</strong>
            <br />
          </EuiText>
          <EuiText size="s" color="subdued">
            {i18n.ASSIGNEE_FLYOUT_EMPTY_LIST_HELP}
          </EuiText>
        </EuiTextAlign>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function AssigneeFlyoutNoMatchesMessage() {
  const { docLinks } = useKibana<CoreStart>().services;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      direction="column"
      justifyContent="spaceAround"
      data-test-subj="alertingV2EditEpisodeAssigneeNoMatches"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="user" size="xl" aria-hidden={true} />
        <EuiSpacer size="xs" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTextAlign textAlign="center">
          <EuiText size="s" color="default">
            <strong>{i18n.ASSIGNEE_FLYOUT_NO_MATCHES_USER_TITLE}</strong>
            <br />
          </EuiText>
          <EuiText size="s" color="subdued">
            {i18n.ASSIGNEE_FLYOUT_NO_MATCHES_MODIFY_SEARCH}
            <br />
            <EuiLink href={docLinks.links.cases.casesPermissions} target="_blank">
              {i18n.ASSIGNEE_FLYOUT_NO_MATCHES_LEARN_PRIVILEGES}
            </EuiLink>
          </EuiText>
        </EuiTextAlign>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export interface EditEpisodeAssigneeFlyoutProps {
  episodeId: string;
  groupHash: string;
  lastAssigneeUid: string | null | undefined;
  onClose: () => void;
}

export function EditEpisodeAssigneeFlyout({
  episodeId,
  groupHash,
  lastAssigneeUid,
  onClose,
}: EditEpisodeAssigneeFlyoutProps) {
  const { http, userProfile, notifications } = useKibana<CoreStart>().services;
  const toasts = notifications.toasts;

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfileWithAvatar | null>(null);
  const selectionTouchedRef = useRef(false);

  useEffect(() => {
    selectionTouchedRef.current = false;
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedProfile(null);
  }, [episodeId, groupHash, lastAssigneeUid]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const { data: currentProfiles } = useBulkGetProfiles({
    userProfile,
    uids: lastAssigneeUid ? [lastAssigneeUid] : [],
    toasts,
    errorTitle: i18n.ASSIGNEE_FLYOUT_CURRENT_PROFILE_ERROR_TITLE,
  });

  const currentProfile = useMemo(
    () => (currentProfiles?.[0] as UserProfileWithAvatar | undefined) ?? undefined,
    [currentProfiles]
  );

  useEffect(() => {
    if (selectionTouchedRef.current || !lastAssigneeUid || currentProfiles === undefined) {
      return;
    }
    setSelectedProfile(currentProfile ?? null);
  }, [currentProfile, currentProfiles, lastAssigneeUid]);

  const { data: suggestions, isFetching: isSuggestLoading } = useSuggestedProfiles({
    userProfile,
    searchTerm: debouncedSearch,
    toasts,
    errorTitle: i18n.ASSIGNEE_FLYOUT_SUGGEST_ERROR_TITLE,
  });

  const suggestOptions = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return undefined;
    }
    return (suggestions ?? []) as UserProfileWithAvatar[];
  }, [debouncedSearch, suggestions]);

  const { mutate: createAssignAction, isLoading: isSaving } = useCreateAlertAction(http);

  const isSaveDisabled = useMemo(() => {
    if (lastAssigneeUid && currentProfiles === undefined) {
      return true;
    }
    return (selectedProfile?.uid ?? null) === (currentProfile?.uid ?? null);
  }, [currentProfiles, currentProfile, lastAssigneeUid, selectedProfile]);

  const handleSave = useCallback(() => {
    createAssignAction(
      {
        groupHash,
        actionType: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
        body: {
          episode_id: episodeId,
          assignee_uid: selectedProfile?.uid ?? null,
        },
      },
      {
        onSuccess: () => {
          toasts.addSuccess(i18n.ASSIGNEE_FLYOUT_SAVE_SUCCESS);
          onClose();
        },
        onError: (err) => {
          toasts.addError(err instanceof Error ? err : new Error(String(err)), {
            title: i18n.ASSIGNEE_FLYOUT_SAVE_ERROR_TITLE,
          });
        },
      }
    );
  }, [createAssignAction, episodeId, groupHash, onClose, selectedProfile, toasts]);

  const subtitle = useMemo(() => i18n.getAssigneeFlyoutSubtitle(episodeId), [episodeId]);

  return (
    <EpisodeActionFlyout
      onClose={onClose}
      dataTestSubj="alertingV2EditEpisodeAssigneeFlyout"
      ariaLabelledBy="alertingV2EditEpisodeAssigneeFlyoutTitle"
      titleId="alertingV2EditEpisodeAssigneeFlyoutTitle"
      title={i18n.ASSIGNEE_FLYOUT_TITLE}
      subtitle={
        <EuiText color="subdued" size="s">
          <p>{subtitle}</p>
        </EuiText>
      }
      footer={
        <EpisodeActionFlyoutFooter
          onClose={onClose}
          onPrimaryClick={handleSave}
          cancelLabel={i18n.ASSIGNEE_FLYOUT_CANCEL}
          primaryLabel={i18n.ASSIGNEE_FLYOUT_SAVE}
          cancelTestSubj="alertingV2EditEpisodeAssigneeCancel"
          primaryTestSubj="alertingV2EditEpisodeAssigneeSave"
          isPrimaryLoading={isSaving}
          isPrimaryDisabled={isSaveDisabled}
          isCancelDisabled={isSaving}
        />
      }
    >
      <UserProfilesSelectable<UserProfileWithAvatar | null>
        data-test-subj="alertingV2EditEpisodeAssigneeSelectable"
        height={360}
        singleSelection
        defaultOptions={currentProfile ? [currentProfile] : []}
        selectedOptions={selectedProfile ? [selectedProfile] : []}
        options={suggestOptions}
        isLoading={isSuggestLoading}
        emptyMessage={<AssigneeFlyoutEmptyListMessage />}
        noMatchesMessage={!isSuggestLoading ? <AssigneeFlyoutNoMatchesMessage /> : undefined}
        onSearchChange={(term) => setSearchInput(term)}
        onChange={(next) => {
          selectionTouchedRef.current = true;
          const picked = next.filter(
            (v): v is UserProfileWithAvatar => v !== null && v !== undefined
          );
          setSelectedProfile(picked[0] ?? null);
        }}
        nullOptionLabel={i18n.ASSIGNEE_FLYOUT_NO_ASSIGNEE_OPTION}
        searchPlaceholder={i18n.ASSIGNEE_FLYOUT_SEARCH_PLACEHOLDER}
      />
    </EpisodeActionFlyout>
  );
}
