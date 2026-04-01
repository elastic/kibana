/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  AnonymizationUiServices,
  FetchPreviewDocument,
  TrustedNerModelOption,
} from '../contracts';
import { DeleteProfileModal } from '../delete_profile_modal/delete_profile_modal';
import { ProfileFlyout } from '../profile_flyout/profile_flyout';
import { ProfilesTable } from '../profiles_table/profiles_table';
import { ProfilesToolbar } from '../profiles_toolbar/profiles_toolbar';
import { TARGET_TYPE_DATA_VIEW } from '../common/target_types';
import { createAnonymizationProfilesClient } from '../common/services/profiles/client';
import { useFindProfiles } from '../common/services/profiles/hooks/use_find_profiles';
import { createTargetLookupClient } from '../common/services/target_lookup/client';
import { useDataViewsList } from '../common/services/target_lookup/hooks/use_data_views_list';
import {
  useAnonymizationProfilesSectionState,
  type AnonymizationMode,
} from './use_anonymization_profiles_section_state';

export interface AnonymizationProfilesSectionProps {
  fetch: AnonymizationUiServices['http']['fetch'];
  spaceId: string;
  canShow: boolean;
  canManage: boolean;
  listTrustedNerModels?: () => Promise<TrustedNerModelOption[]>;
  fetchPreviewDocument?: FetchPreviewDocument;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onCreateConflict?: () => void;
  onOpenConflictError?: (error: unknown) => void;
}

const toModeLabel = (mode: AnonymizationMode): string => {
  if (mode === 'manage') {
    return i18n.translate('anonymizationUi.profiles.section.mode.manage', {
      defaultMessage: 'Manage',
    });
  }

  return i18n.translate('anonymizationUi.profiles.section.mode.readOnly', {
    defaultMessage: 'Read only',
  });
};

export const AnonymizationProfilesSection = ({
  fetch,
  spaceId,
  canShow,
  canManage,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  listTrustedNerModels,
  fetchPreviewDocument,
  onCreateConflict,
  onOpenConflictError,
}: AnonymizationProfilesSectionProps) => {
  const profilesClient = useMemo(() => createAnonymizationProfilesClient({ fetch }), [fetch]);
  const profilesQueryContext = useMemo(() => ({ spaceId }), [spaceId]);
  const {
    listView,
    deleteFlow,
    form,
    flyoutState,
    createConflictProfileId,
    hasCreateConflict,
    effectiveMode,
    hasReadOnlyApiError,
    isManageMode,
    closeFlyout,
    closeDeleteModal,
    confirmDelete,
    submitFlyout,
    openProfileById,
    onCreateProfile,
    onEditProfile,
    onTablePageChange,
  } = useAnonymizationProfilesSectionState({
    fetch,
    spaceId,
    canShow,
    canManage,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onCreateConflict,
    onOpenConflictError,
  });
  const unavailableProfilesQuery = useFindProfiles({
    client: profilesClient,
    context: profilesQueryContext,
    query: {
      targetType: form.values.targetType,
      page: 1,
      perPage: 1000,
    },
    enabled: Boolean(flyoutState),
  });
  const targetLookupClient = useMemo(() => createTargetLookupClient({ fetch }), [fetch]);
  const hasDataViewProfiles = listView.profiles.some(
    (profile) => profile.targetType === TARGET_TYPE_DATA_VIEW
  );
  const dataViewsQuery = useDataViewsList({
    client: targetLookupClient,
    enabled: effectiveMode !== 'hidden' && hasDataViewProfiles,
  });
  const dataViewTitlesById = useMemo(
    () =>
      Object.fromEntries(
        (dataViewsQuery.data?.data_view ?? [])
          .filter(
            (dataView) => typeof dataView.id === 'string' && typeof dataView.title === 'string'
          )
          .map((dataView) => [dataView.id, dataView.title])
      ),
    [dataViewsQuery.data]
  );
  const unavailableTargetIds = useMemo(() => {
    if (!flyoutState) {
      return [];
    }

    const ids = (unavailableProfilesQuery.data?.data ?? [])
      .filter((profile) => profile.targetType === form.values.targetType)
      .map((profile) => profile.targetId);

    // Keep current target selectable while editing this profile.
    if (flyoutState.mode === 'edit') {
      return ids.filter((targetId) => targetId !== flyoutState.profile.targetId);
    }

    return ids;
  }, [flyoutState, form.values.targetType, unavailableProfilesQuery.data?.data]);

  if (effectiveMode === 'hidden') {
    return null;
  }

  return (
    <div data-test-subj="anonymizationProfilesSection">
      <EuiText size="s">
        <p data-test-subj="anonymizationProfilesTitle">
          <FormattedMessage
            id="anonymizationUi.profiles.section.description"
            defaultMessage="Configure reusable anonymization profiles once per target and space for AI feature portability."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <ProfilesToolbar
        modeLabel={toModeLabel(effectiveMode)}
        isManageMode={isManageMode}
        activeSpaceId={spaceId}
        targetType={listView.filters.targetType}
        onTargetTypeChange={listView.setTargetType}
        targetIdFilter={listView.filters.queryText}
        onTargetIdFilterChange={listView.setTargetId}
        onCreateProfile={onCreateProfile}
      />

      <EuiSpacer size="m" />
      {listView.error && (
        <>
          <EuiCallOut
            announceOnMount
            color={hasReadOnlyApiError ? 'warning' : 'danger'}
            iconType="info"
            title={i18n.translate('anonymizationUi.profiles.section.errorTitle', {
              defaultMessage: 'Anonymization profiles are partially unavailable',
            })}
            data-test-subj="anonymizationProfilesError"
          >
            <p>{listView.error.message}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <ProfilesTable
        profiles={listView.profiles}
        loading={listView.loading}
        total={listView.total}
        page={listView.pagination.page}
        perPage={listView.pagination.perPage}
        isManageMode={isManageMode}
        dataViewTitlesById={dataViewTitlesById}
        onPageChange={onTablePageChange}
        onEditProfile={onEditProfile}
        onDeleteProfile={deleteFlow.openConfirmation}
      />

      {!isManageMode && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="anonymizationUi.profiles.section.readOnlyHint"
                defaultMessage="Your role has read-only access. Create, edit, and delete actions are disabled."
              />
            </p>
          </EuiText>
        </>
      )}

      {flyoutState && (
        <ProfileFlyout
          isEdit={flyoutState.mode === 'edit'}
          isManageMode={isManageMode}
          name={form.values.name}
          description={form.values.description}
          targetType={form.values.targetType}
          targetId={form.values.targetId}
          fieldRules={form.values.fieldRules}
          regexRules={form.values.regexRules}
          nerRules={form.values.nerRules}
          nameError={form.validationErrors.name}
          targetIdError={form.validationErrors.targetId}
          fieldRulesError={form.validationErrors.fieldRules}
          regexRulesError={form.validationErrors.regexRules}
          nerRulesError={form.validationErrors.nerRules}
          submitError={form.submitError}
          hasConflict={flyoutState.mode === 'create' && hasCreateConflict}
          conflictProfileId={createConflictProfileId}
          isSubmitting={form.isSubmitting}
          onNameChange={form.setName}
          onDescriptionChange={form.setDescription}
          onTargetTypeChange={form.setTargetType}
          onTargetIdChange={form.setTargetId}
          onFieldRulesChange={form.setFieldRules}
          onRegexRulesChange={form.setRegexRules}
          onNerRulesChange={form.setNerRules}
          listTrustedNerModels={listTrustedNerModels}
          fetchPreviewDocument={fetchPreviewDocument}
          unavailableTargetIds={unavailableTargetIds}
          fetch={fetch}
          onOpenConflictProfile={openProfileById}
          onCancel={closeFlyout}
          onSubmit={submitFlyout}
        />
      )}

      {deleteFlow.pendingProfileId && (
        <DeleteProfileModal
          isDeleting={deleteFlow.isDeleting}
          errorMessage={deleteFlow.error?.message}
          onCancel={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};
