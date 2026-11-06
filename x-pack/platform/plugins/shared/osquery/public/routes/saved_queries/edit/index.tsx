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
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';

import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../common/lib/kibana';
import { fullWidthFormContentCss } from '../../../components/layouts';
import { useOsquerySubpageTitle } from '../../../components/osquery_page_header_context';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useDuplicateGuard } from '../../../common/hooks/use_duplicate_guard';
import { EditSavedQueryForm } from './form';
import { useDeleteSavedQuery, useUpdateSavedQuery, useSavedQuery } from '../../../saved_queries';
import { useCopySavedQuery } from '../../../saved_queries/use_copy_saved_query';

const EditSavedQueryPageComponent = () => {
  const confirmModalTitleId = useGeneratedHtmlId();

  const permissions = useKibana().services.application.capabilities.osquery;

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const { savedQueryId } = useParams<{ savedQueryId: string }>();

  const { isLoading, data: savedQueryDetails, error } = useSavedQuery({ savedQueryId });
  const updateSavedQueryMutation = useUpdateSavedQuery({ savedQueryId });
  const deleteSavedQueryMutation = useDeleteSavedQuery({ savedQueryId });
  const copySavedQueryMutation = useCopySavedQuery({ savedQueryId });

  useBreadcrumbs('saved_query_edit', { savedQueryName: savedQueryDetails?.saved_object_id ?? '' });

  const elasticPrebuiltQuery = useMemo(() => !!savedQueryDetails?.prebuilt, [savedQueryDetails]);
  const viewMode = useMemo(
    () => !permissions.writeSavedQueries || elasticPrebuiltQuery,
    [permissions.writeSavedQueries, elasticPrebuiltQuery]
  );

  const handleCloseDeleteConfirmationModal = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirmClick = useCallback(() => {
    deleteSavedQueryMutation.mutateAsync().then(() => {
      handleCloseDeleteConfirmationModal();
    });
  }, [deleteSavedQueryMutation, handleCloseDeleteConfirmationModal]);

  const { handleDuplicateClick, handleDirtyStateChange, duplicateModal } = useDuplicateGuard({
    copyMutation: copySavedQueryMutation,
    resourceType: 'query',
  });

  const pageTitle = useMemo(() => {
    if (error) {
      return viewMode
        ? i18n.translate('xpack.osquery.viewSavedQuery.loadError.pageTitle', {
            defaultMessage: 'Saved query',
          })
        : i18n.translate('xpack.osquery.editSavedQuery.loadError.pageTitle', {
            defaultMessage: 'Edit saved query',
          });
    }

    if (!savedQueryDetails?.id) {
      return undefined;
    }

    if (viewMode) {
      return i18n.translate('xpack.osquery.viewSavedQuery.pageTitle', {
        defaultMessage: '"{savedQueryId}" details',
        values: { savedQueryId: savedQueryDetails.id },
      });
    }

    return i18n.translate('xpack.osquery.editSavedQuery.pageTitle', {
      defaultMessage: 'Edit "{savedQueryId}"',
      values: { savedQueryId: savedQueryDetails.id },
    });
  }, [error, savedQueryDetails?.id, viewMode]);

  useOsquerySubpageTitle(pageTitle);

  const actionButtons = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s">
        {permissions.writeSavedQueries && (
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleDuplicateClick}
              iconType="copy"
              isLoading={copySavedQueryMutation.isLoading}
            >
              {i18n.translate('xpack.osquery.editSavedQuery.duplicateSavedQueryButtonLabel', {
                defaultMessage: 'Duplicate query',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        {!viewMode && (
          <EuiFlexItem grow={false}>
            <EuiButton color="danger" onClick={handleDeleteClick} iconType="trash">
              <FormattedMessage
                id="xpack.osquery.editSavedQuery.deleteSavedQueryButtonLabel"
                defaultMessage="Delete query"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    [
      permissions.writeSavedQueries,
      handleDuplicateClick,
      copySavedQueryMutation.isLoading,
      viewMode,
      handleDeleteClick,
    ]
  );

  const titleProps = useMemo(() => ({ id: confirmModalTitleId }), [confirmModalTitleId]);

  const handleSubmit = useCallback(
    async (payload: any) => {
      await updateSavedQueryMutation.mutateAsync(payload);
    },
    [updateSavedQueryMutation]
  );

  const deleteModal = isDeleteModalVisible ? (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      titleProps={titleProps}
      title={
        <FormattedMessage
          id="xpack.osquery.deleteSavedQuery.confirmationModal.title"
          defaultMessage="Are you sure you want to delete this query?"
        />
      }
      onCancel={handleCloseDeleteConfirmationModal}
      onConfirm={handleDeleteConfirmClick}
      cancelButtonText={
        <FormattedMessage
          id="xpack.osquery.deleteSavedQuery.confirmationModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.osquery.deleteSavedQuery.confirmationModal.confirmButtonLabel"
          defaultMessage="Confirm"
        />
      }
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <FormattedMessage
        id="xpack.osquery.deleteSavedQuery.confirmationModal.body"
        defaultMessage="You're about to delete this query. Are you sure you want to do this?"
      />
    </EuiConfirmModal>
  ) : null;

  const formContent = !isLoading &&
    !isEmpty(savedQueryDetails) &&
    savedQueryDetails?.saved_object_id === savedQueryId && (
      <EditSavedQueryForm
        key={savedQueryId}
        defaultValue={savedQueryDetails}
        handleSubmit={handleSubmit}
        viewMode={viewMode}
        onDirtyStateChange={handleDirtyStateChange}
      />
    );

  if (isLoading) return null;

  if (error) {
    return (
      <div css={fullWidthFormContentCss}>
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.osquery.editSavedQuery.loadError.title', {
            defaultMessage: 'Failed to load saved query',
          })}
          color="danger"
          iconType="error"
        >
          <FormattedMessage
            id="xpack.osquery.editSavedQuery.loadError.body"
            defaultMessage="The saved query could not be loaded. Please try again later."
          />
        </EuiCallOut>
      </div>
    );
  }

  return (
    <div css={fullWidthFormContentCss}>
      {permissions.writeSavedQueries && (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>{actionButtons}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      {elasticPrebuiltQuery && (
        <>
          <EuiCallOut announceOnMount size="s">
            <FormattedMessage
              id="xpack.osquery.viewSavedQuery.prebuiltInfo"
              defaultMessage="This is a prebuilt Elastic query, and it cannot be edited."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {formContent}
      {deleteModal}
      {duplicateModal}
    </div>
  );
};

export const EditSavedQueryPage = React.memo(EditSavedQueryPageComponent);
