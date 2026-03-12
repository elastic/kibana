/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiConfirmModal,
  EuiText,
  EuiCallOut,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';

import { i18n } from '@kbn/i18n';

import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { EditSavedQueryForm } from './form';
import { useDeleteSavedQuery, useUpdateSavedQuery, useSavedQuery } from '../../../saved_queries';
import { useCopySavedQuery } from '../../../saved_queries/use_copy_saved_query';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';

const euiCalloutCss = {
  margin: '10px',
};

const EditSavedQueryPageComponent = () => {
  const confirmModalTitleId = useGeneratedHtmlId();

  const permissions = useKibana().services.application.capabilities.osquery;
  const queryHistoryRework = useIsExperimentalFeatureEnabled('queryHistoryRework');

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const { savedQueryId } = useParams<{ savedQueryId: string }>();
  const savedQueryListProps = useRouterNavigate('saved_queries');

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

  const handleDuplicateClick = useCallback(() => {
    copySavedQueryMutation.mutateAsync();
  }, [copySavedQueryMutation]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...savedQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.editSavedQuery.viewSavedQueriesListTitle"
              defaultMessage="View all saved queries"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              {viewMode ? (
                <>
                  <FormattedMessage
                    id="xpack.osquery.viewSavedQuery.pageTitle"
                    defaultMessage='"{savedQueryId}" details'
                    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                    values={{
                      savedQueryId: savedQueryDetails?.id ?? '',
                    }}
                  />
                  {elasticPrebuiltQuery && (
                    <EuiCallOut announceOnMount css={euiCalloutCss} size="s">
                      <FormattedMessage
                        id="xpack.osquery.viewSavedQuery.prebuiltInfo"
                        defaultMessage="This is a prebuilt Elastic query, and it cannot be edited."
                      />
                    </EuiCallOut>
                  )}
                </>
              ) : (
                <FormattedMessage
                  id="xpack.osquery.editSavedQuery.pageTitle"
                  defaultMessage='Edit "{savedQueryId}"'
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  values={{
                    savedQueryId: savedQueryDetails?.id ?? '',
                  }}
                />
              )}
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [elasticPrebuiltQuery, savedQueryDetails?.id, savedQueryListProps, viewMode]
  );

  const RightColumn = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s">
        {queryHistoryRework && permissions.writeSavedQueries && (
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
      queryHistoryRework,
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

  if (isLoading) return null;

  if (error) {
    return (
      <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
        <EuiCallOut
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
      </WithHeaderLayout>
    );
  }

  return (
    <WithHeaderLayout
      leftColumn={LeftColumn}
      rightColumn={
        permissions.writeSavedQueries && (queryHistoryRework || !viewMode) ? RightColumn : undefined
      }
      rightColumnGrow={false}
    >
      {!isLoading &&
        !isEmpty(savedQueryDetails) &&
        savedQueryDetails?.saved_object_id === savedQueryId && (
          <EditSavedQueryForm
            key={savedQueryId}
            defaultValue={savedQueryDetails}
            handleSubmit={handleSubmit}
            viewMode={viewMode}
          />
        )}
      {isDeleteModalVisible ? (
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
      ) : null}
    </WithHeaderLayout>
  );
};

export const EditSavedQueryPage = React.memo(EditSavedQueryPageComponent);
