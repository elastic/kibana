/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery } from '@kbn/react-query';
import type { AccessControlInput } from '@kbn/entity-access-control';
import { AccessControlForm } from '@kbn/entity-access-control-ui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ConnectorAccessRole } from '@kbn/actions-plugin/common';
import {
  loadConnectorAccessControl,
  suggestConnectorUserProfiles,
  updateConnectorAccessControl,
} from '../../../lib/action_connector_api';
import { useKibana } from '../../../../common/lib/kibana';
import type { ActionConnector } from '../../../../types';

const ROLES = [
  {
    value: 'executor' as ConnectorAccessRole,
    text: i18n.translate('xpack.triggersActionsUI.sections.connectorAccess.executorRole', {
      defaultMessage: 'Can run',
    }),
  },
] as const;

const PUBLIC_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.sections.connectorAccess.publicDescription',
  {
    defaultMessage: 'Anyone with connector privileges in this space can use this connector.',
  }
);

export interface ConnectorAccessProps {
  connector: ActionConnector;
}

const ConnectorAccessComponent: React.FC<ConnectorAccessProps> = ({ connector }) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [draft, setDraft] = useState<AccessControlInput<ConnectorAccessRole>>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useDebounce(() => setDebouncedSearch(search), 300, [search]);

  const {
    data: accessControl,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['connectorAccessControl', connector.id],
    queryFn: ({ signal }) => loadConnectorAccessControl({ http, id: connector.id, signal }),
  });

  const canManage = accessControl?.permissions.manage ?? false;

  const { data: suggestedProfiles = [], isFetching: isSearching } = useQuery({
    queryKey: ['connectorAccessControlSuggest', connector.id, debouncedSearch],
    queryFn: ({ signal }) =>
      suggestConnectorUserProfiles({ http, id: connector.id, name: debouncedSearch, signal }),
    enabled: canManage,
  });

  const { mutateAsync: save, isLoading: isSaving } = useMutation({
    mutationFn: (input: AccessControlInput<ConnectorAccessRole>) =>
      updateConnectorAccessControl({ http, id: connector.id, accessControl: input }),
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.connectorAccess.saveSuccess', {
          defaultMessage: 'Updated access for {connectorName}',
          values: { connectorName: connector.name },
        })
      );
      refetch();
    },
    onError: (saveError: { body?: { message?: string } }) => {
      toasts.addDanger(
        saveError.body?.message ??
          i18n.translate('xpack.triggersActionsUI.sections.connectorAccess.saveError', {
            defaultMessage: 'Cannot update the access of this connector.',
          })
      );
    },
  });

  // Reset the draft whenever the server state changes so a failed save doesn't keep stale edits.
  useEffect(() => {
    if (accessControl?.access_control) {
      const { access_mode: accessMode, entries } = accessControl.access_control;
      setDraft({
        access_mode: accessMode,
        entries: entries.map(({ type, id, role }) => ({ type, id, role })),
      });
    }
  }, [accessControl]);

  const onSave = useCallback(() => {
    if (draft) {
      save(draft);
    }
  }, [draft, save]);

  const profiles = useMemo(
    () => (accessControl?.profiles ?? []) as UserProfileWithAvatar[],
    [accessControl]
  );

  if (error) {
    return (
      <KbnDangerCallout
        announceOnMount
        size="s"
        data-test-subj="connectorAccessLoadError"
        title={i18n.translate('xpack.triggersActionsUI.sections.connectorAccess.loadError', {
          defaultMessage: 'Cannot load the access of this connector.',
        })}
      />
    );
  }

  if (isLoading || !accessControl) {
    return (
      <EuiFlexGroup justifyContent="center" data-test-subj="connectorAccessLoading">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <div data-test-subj="connectorAccessTab">
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.triggersActionsUI.sections.connectorAccess.description', {
          defaultMessage:
            'Access control narrows who can use this connector. It never grants privileges a user does not already have in this space.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      {/* The current access of a connector is only disclosed to the users that own it. */}
      {!canManage || !draft ? (
        <KbnInfoCallout
          announceOnMount
          size="s"
          data-test-subj="connectorAccessReadOnlyCallout"
          title={i18n.translate('xpack.triggersActionsUI.sections.connectorAccess.readOnlyTitle', {
            defaultMessage: 'Only the owner can view and change the access of this connector',
          })}
        />
      ) : (
        <>
          <AccessControlForm<ConnectorAccessRole>
            value={draft}
            onChange={setDraft}
            ownerId={accessControl.owner}
            currentUserId={accessControl.current_user_profile_id}
            profiles={profiles}
            suggestedProfiles={suggestedProfiles as UserProfileWithAvatar[]}
            onSearch={setSearch}
            roles={ROLES}
            publicDescription={PUBLIC_DESCRIPTION}
            allowPublicEntries={false}
            isDisabled={isSaving}
            isSearching={isSearching}
          />
          <EuiSpacer size="m" />
          <EuiButton
            fill
            onClick={onSave}
            isLoading={isSaving}
            data-test-subj="connectorAccessSaveButton"
          >
            {i18n.translate('xpack.triggersActionsUI.sections.connectorAccess.saveButtonLabel', {
              defaultMessage: 'Save access',
            })}
          </EuiButton>
        </>
      )}
    </div>
  );
};

export const ConnectorAccess = memo(ConnectorAccessComponent);
