/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  euiFullHeight,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { useBulkGetProfiles } from '../../hooks/use_bulk_get_profiles';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';
import { useSuggestedProfiles } from '../../hooks/use_suggested_profiles';
import {
  ASSIGNEE_FLYOUT_CANCEL,
  ASSIGNEE_FLYOUT_CURRENT_PROFILE_ERROR_TITLE,
  ASSIGNEE_FLYOUT_EMPTY_LIST_HELP,
  ASSIGNEE_FLYOUT_EMPTY_LIST_TITLE,
  ASSIGNEE_FLYOUT_NO_MATCHES_LEARN_PRIVILEGES,
  ASSIGNEE_FLYOUT_NO_MATCHES_MODIFY_SEARCH,
  ASSIGNEE_FLYOUT_NO_MATCHES_USER_TITLE,
  ASSIGNEE_FLYOUT_SAVE,
  ASSIGNEE_FLYOUT_SAVE_ERROR_TITLE,
  ASSIGNEE_FLYOUT_SAVE_SUCCESS,
  ASSIGNEE_FLYOUT_SEARCH_PLACEHOLDER,
  ASSIGNEE_FLYOUT_SUGGEST_ERROR_TITLE,
  ASSIGNEE_FLYOUT_TITLE,
  getAssigneeFlyoutSubtitle,
} from './translations';

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
            <strong>{ASSIGNEE_FLYOUT_EMPTY_LIST_TITLE}</strong>
            <br />
          </EuiText>
          <EuiText size="s" color="subdued">
            {ASSIGNEE_FLYOUT_EMPTY_LIST_HELP}
          </EuiText>
        </EuiTextAlign>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/** Mirrors Cases `EmptyMessage` (renders nothing) while user search is loading. */
function AssigneeFlyoutNoMatchesLoadingPlaceholder() {
  return null;
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
            <strong>{ASSIGNEE_FLYOUT_NO_MATCHES_USER_TITLE}</strong>
            <br />
          </EuiText>
          <EuiText size="s" color="subdued">
            {ASSIGNEE_FLYOUT_NO_MATCHES_MODIFY_SEARCH}
            <br />
            <EuiLink href={docLinks.links.cases.casesPermissions} target="_blank">
              {ASSIGNEE_FLYOUT_NO_MATCHES_LEARN_PRIVILEGES}
            </EuiLink>
          </EuiText>
        </EuiTextAlign>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const flyoutBodyCss = css`
  ${euiFullHeight()}

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
  }
`;

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

  useEffect(() => {
    setSearchInput('');
    setDebouncedSearch('');
  }, [episodeId, groupHash]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const { data: currentProfiles } = useBulkGetProfiles({
    userProfile,
    uids: lastAssigneeUid ? [lastAssigneeUid] : [],
    toasts,
    errorTitle: ASSIGNEE_FLYOUT_CURRENT_PROFILE_ERROR_TITLE,
  });

  const currentProfile = useMemo(
    () => (currentProfiles?.[0] as UserProfileWithAvatar | undefined) ?? undefined,
    [currentProfiles]
  );

  const [selectedProfile, setSelectedProfile] = useState<UserProfileWithAvatar | null>(
    currentProfile ?? null
  );

  useEffect(() => {
    setSelectedProfile(currentProfile ?? null);
  }, [currentProfile]);

  const { data: suggestions, isFetching: isSuggestLoading } = useSuggestedProfiles({
    userProfile,
    searchTerm: debouncedSearch,
    toasts,
    errorTitle: ASSIGNEE_FLYOUT_SUGGEST_ERROR_TITLE,
  });

  const suggestOptions = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return undefined;
    }
    return (suggestions ?? []) as UserProfileWithAvatar[];
  }, [debouncedSearch, suggestions]);

  const { mutate: createAssignAction, isLoading: isSaving } = useCreateAlertAction(http);

  const handleSave = useCallback(() => {
    if (!selectedProfile) {
      return;
    }
    createAssignAction(
      {
        groupHash,
        actionType: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
        body: {
          episode_id: episodeId,
          assignee_uid: selectedProfile.uid,
        },
      },
      {
        onSuccess: () => {
          toasts.addSuccess(ASSIGNEE_FLYOUT_SAVE_SUCCESS);
          onClose();
        },
        onError: (err) => {
          toasts.addError(err instanceof Error ? err : new Error(String(err)), {
            title: ASSIGNEE_FLYOUT_SAVE_ERROR_TITLE,
          });
        },
      }
    );
  }, [createAssignAction, episodeId, groupHash, onClose, selectedProfile, toasts]);

  const subtitle = useMemo(() => getAssigneeFlyoutSubtitle(episodeId), [episodeId]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="alertingV2EditEpisodeAssigneeFlyoutTitle"
      data-test-subj="alertingV2EditEpisodeAssigneeFlyout"
      size="s"
      paddingSize="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="alertingV2EditEpisodeAssigneeFlyoutTitle">{ASSIGNEE_FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <p>{subtitle}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={flyoutBodyCss}>
        <UserProfilesSelectable<UserProfileWithAvatar>
          data-test-subj="alertingV2EditEpisodeAssigneeSelectable"
          height={360}
          singleSelection
          defaultOptions={currentProfile ? [currentProfile] : []}
          selectedOptions={selectedProfile ? [selectedProfile] : []}
          options={suggestOptions}
          isLoading={isSuggestLoading}
          emptyMessage={<AssigneeFlyoutEmptyListMessage />}
          noMatchesMessage={
            !isSuggestLoading ? (
              <AssigneeFlyoutNoMatchesMessage />
            ) : (
              <AssigneeFlyoutNoMatchesLoadingPlaceholder />
            )
          }
          onSearchChange={(term) => setSearchInput(term)}
          onChange={(next) => {
            const picked = next.filter((v): v is UserProfileWithAvatar => Boolean(v));
            setSelectedProfile(picked[0] ?? null);
          }}
          searchPlaceholder={ASSIGNEE_FLYOUT_SEARCH_PLACEHOLDER}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              isDisabled={isSaving}
              data-test-subj="alertingV2EditEpisodeAssigneeCancel"
            >
              {ASSIGNEE_FLYOUT_CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={isSaving}
              isDisabled={!selectedProfile}
              data-test-subj="alertingV2EditEpisodeAssigneeSave"
            >
              {ASSIGNEE_FLYOUT_SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
