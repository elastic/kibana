/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { fullWidthFormContentCss } from '../../../components/layouts';
import { useOsquerySubpageTitle } from '../../../components/osquery_page_header_context';
import { useKibana } from '../../../common/lib/kibana';
import { PackForm } from '../../../packs/form';
import { usePack } from '../../../packs/use_pack';
import { useDeletePack } from '../../../packs/use_delete_pack';
import { useCopyPack } from '../../../packs/use_copy_pack';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useDuplicateGuard } from '../../../common/hooks/use_duplicate_guard';

const EditPackPageComponent = () => {
  const confirmModalTitleId = useGeneratedHtmlId();

  const permissions = useKibana().services.application.capabilities.osquery;
  const canWritePacks = !!permissions.writePacks;

  const { packId } = useParams<{ packId: string }>();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { isLoading, data, error } = usePack({ packId });
  const deletePackMutation = useDeletePack({ packId, withRedirect: true });
  const copyPackMutation = useCopyPack({ packId });
  // Full lockdown: a readPacks-only user can view but not edit anything.
  const isReadOnly = !canWritePacks;
  // Prebuilt (Elastic-managed) pack: queries/name/description are immutable, but
  // a writePacks user may still re-target its scheduled agent policies/shards
  // (see the prebuiltPackModeDescription callout below).
  const isPrebuilt = !!data?.read_only;

  const { handleDuplicateClick, handleDirtyStateChange, duplicateModal } = useDuplicateGuard({
    copyMutation: copyPackMutation,
    resourceType: 'pack',
  });

  useBreadcrumbs('pack_edit', {
    packId: data?.id ?? '',
    packName: data?.name ?? '',
    isReadOnly,
  });

  const handleCloseDeleteConfirmationModal = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirmClick = useCallback(() => {
    deletePackMutation.mutateAsync().then(() => {
      handleCloseDeleteConfirmationModal();
    });
  }, [deletePackMutation, handleCloseDeleteConfirmationModal]);

  const pageTitle = useMemo(() => {
    if (error) {
      return isReadOnly
        ? i18n.translate('xpack.osquery.viewPack.loadError.pageTitle', {
            defaultMessage: 'View pack',
          })
        : i18n.translate('xpack.osquery.editPack.loadError.pageTitle', {
            defaultMessage: 'Edit pack',
          });
    }

    if (!data?.name) {
      return undefined;
    }

    return isReadOnly
      ? i18n.translate('xpack.osquery.viewPack.pageTitle', {
          defaultMessage: 'View {queryName}',
          values: { queryName: data.name },
        })
      : i18n.translate('xpack.osquery.editPack.pageTitle', {
          defaultMessage: 'Edit {queryName}',
          values: { queryName: data.name },
        });
  }, [data?.name, error, isReadOnly]);

  useOsquerySubpageTitle(pageTitle);

  // Write actions (duplicate, delete) are only available to users with
  // writePacks. readPacks-only users see a fully read-only view.
  const RightColumn = useMemo(
    () =>
      canWritePacks ? (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleDuplicateClick}
              iconType="copy"
              isLoading={copyPackMutation.isLoading}
            >
              {i18n.translate('xpack.osquery.editPack.duplicatePackButtonLabel', {
                defaultMessage: 'Duplicate pack',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="danger" onClick={handleDeleteClick} iconType="trash">
              <FormattedMessage
                id="xpack.osquery.editPack.deletePackButtonLabel"
                defaultMessage="Delete pack"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null,
    [canWritePacks, handleDuplicateClick, copyPackMutation.isLoading, handleDeleteClick]
  );

  const HeaderContent = useMemo(() => {
    if (!canWritePacks) {
      return (
        <>
          <EuiSpacer />
          <EuiCallOut announceOnMount>
            <FormattedMessage
              id="xpack.osquery.editPack.readOnlyModeDescription"
              defaultMessage="You have read-only access to packs. You can view this pack but cannot make changes."
            />
          </EuiCallOut>
        </>
      );
    }

    return data?.read_only ? (
      <>
        <EuiSpacer />
        <EuiCallOut announceOnMount>
          <FormattedMessage
            id="xpack.osquery.editPack.prebuiltPackModeDescription"
            defaultMessage="This is a prebuilt Elastic pack. You can modify the scheduled agent policies, but you cannot edit queries in the pack."
          />
        </EuiCallOut>
      </>
    ) : null;
  }, [canWritePacks, data?.read_only]);

  const titleProps = useMemo(() => ({ id: confirmModalTitleId }), [confirmModalTitleId]);

  const formContent =
    !data || data.saved_object_id !== packId ? (
      <EuiSkeletonText lines={10} />
    ) : (
      <PackForm
        // updated_at in the key remounts the form after an update so it
        // re-seeds from fresh data instead of the cached pre-update queries.
        key={`${packId}-${data.updated_at}`}
        editMode={true}
        defaultValue={data}
        isReadOnly={isReadOnly}
        isPrebuilt={isPrebuilt}
        onDirtyStateChange={handleDirtyStateChange}
      />
    );

  const deleteModal = isDeleteModalVisible ? (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      titleProps={titleProps}
      title={
        <FormattedMessage
          id="xpack.osquery.deletePack.confirmationModal.title"
          defaultMessage="Are you sure you want to delete this pack?"
        />
      }
      onCancel={handleCloseDeleteConfirmationModal}
      onConfirm={handleDeleteConfirmClick}
      confirmButtonDisabled={deletePackMutation.isLoading}
      cancelButtonText={
        <FormattedMessage
          id="xpack.osquery.deletePack.confirmationModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.osquery.deletePack.confirmationModal.confirmButtonLabel"
          defaultMessage="Confirm"
        />
      }
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <FormattedMessage
        id="xpack.osquery.deletePack.confirmationModal.body"
        defaultMessage="You're about to delete this pack. Are you sure you want to do this?"
      />
    </EuiConfirmModal>
  ) : null;

  if (isLoading) return null;

  if (error) {
    return (
      <div css={fullWidthFormContentCss}>
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.osquery.editPack.loadError.title', {
            defaultMessage: 'Failed to load pack',
          })}
          color="danger"
          iconType="error"
        >
          <FormattedMessage
            id="xpack.osquery.editPack.loadError.body"
            defaultMessage="The pack could not be loaded. Please try again later."
          />
        </EuiCallOut>
      </div>
    );
  }

  return (
    <div css={fullWidthFormContentCss}>
      {RightColumn && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>{RightColumn}</EuiFlexItem>
        </EuiFlexGroup>
      )}
      {HeaderContent}
      <EuiSpacer size="l" />
      {formContent}
      {deleteModal}
      {duplicateModal}
    </div>
  );
};

export const EditPackPage = React.memo(EditPackPageComponent);
