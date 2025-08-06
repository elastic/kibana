/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiConfirmModal, EuiText, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { noop } from 'lodash';
import React, { useCallback } from 'react';
import { useCreateToolFlyout } from '../../hooks/tools/use_create_tools';
import { useDeleteToolModal, useDeleteToolsModal } from '../../hooks/tools/use_delete_tools';
import { useEditToolFlyout } from '../../hooks/tools/use_edit_tools';
import { labels } from '../../utils/i18n';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
} from '../../utils/transform_esql_form_data';
import { OnechatEsqlToolFlyout, OnechatEsqlToolFlyoutMode } from './esql/esql_tool_flyout';
import { OnechatEsqlToolFormData } from './esql/form/types/esql_tool_form_types';
import { OnechatToolsTable } from './table/tools_table';

export const OnechatTools = () => {
  const { euiTheme } = useEuiTheme();

  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeletingTool,
    toolId: deleteToolId,
    deleteTool,
    confirmDelete,
    cancelDelete,
  } = useDeleteToolModal();

  const {
    isOpen: isBulkDeleteToolsModalOpen,
    isLoading: isBulkDeletingTools,
    toolIds: bulkDeleteToolIds,
    deleteTools: bulkDeleteTools,
    confirmDelete: confirmBulkDeleteTools,
    cancelDelete: cancelBulkDeleteTools,
  } = useDeleteToolsModal();

  const {
    isOpen: isCreateToolFlyoutOpen,
    openFlyout: openCreateToolFlyout,
    closeFlyout: closeCreateToolFlyout,
    submit: createTool,
    isSubmitting: isCreatingTool,
    isLoading: isLoadingSourceTool,
    sourceTool: sourceTool,
  } = useCreateToolFlyout();

  const {
    isOpen: isEditToolFlyoutOpen,
    tool: editingTool,
    openFlyout: openEditToolFlyout,
    closeFlyout: closeEditToolFlyout,
    submit: updateTool,
    isLoading: isLoadingEditTool,
    isSubmitting: isUpdatingTool,
  } = useEditToolFlyout();

  const handleCreateTool = useCallback(
    (data: OnechatEsqlToolFormData) => {
      createTool(transformEsqlFormDataForCreate(data));
    },
    [createTool]
  );

  const handleUpdateTool = useCallback(
    (data: OnechatEsqlToolFormData) => {
      updateTool(transformEsqlFormDataForUpdate(data));
    },
    [updateTool]
  );

  const isEditingTool = isEditToolFlyoutOpen;
  const esqlToolFlyoutProps = isEditingTool
    ? {
        isOpen: isEditToolFlyoutOpen,
        onClose: closeEditToolFlyout,
        mode: OnechatEsqlToolFlyoutMode.Edit,
        tool: editingTool,
        submit: handleUpdateTool,
        isSubmitting: isUpdatingTool,
        isLoading: isLoadingEditTool,
      }
    : {
        isOpen: isCreateToolFlyoutOpen,
        onClose: closeCreateToolFlyout,
        mode: OnechatEsqlToolFlyoutMode.Create,
        tool: sourceTool,
        submit: handleCreateTool,
        isSubmitting: isCreatingTool,
        isLoading: isLoadingSourceTool,
      };

  const deleteEsqlToolTitleId = useGeneratedHtmlId({
    prefix: 'deleteEsqlToolTitle',
  });

  const bulkDeleteEsqlToolsTitleId = useGeneratedHtmlId({
    prefix: 'bulkDeleteEsqlToolsTitle',
  });

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={labels.tools.title}
        description={labels.tools.description}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiButton
            key="new-esql-tool-button"
            fill
            iconType="plusInCircleFilled"
            onClick={() => openCreateToolFlyout()}
          >
            <EuiText size="s">{labels.tools.newToolButton}</EuiText>
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <OnechatToolsTable
          editTool={openEditToolFlyout}
          deleteTool={deleteTool}
          testTool={noop}
          cloneTool={openCreateToolFlyout}
          bulkDeleteTools={bulkDeleteTools}
        />
        <OnechatEsqlToolFlyout {...esqlToolFlyoutProps} />
        {isDeleteModalOpen && (
          <EuiConfirmModal
            title={deleteToolId ? labels.tools.deleteEsqlToolTitle(deleteToolId) : ''}
            aria-labelledby={deleteEsqlToolTitleId}
            titleProps={{ id: deleteEsqlToolTitleId }}
            onCancel={cancelDelete}
            onConfirm={confirmDelete}
            isLoading={isDeletingTool}
            cancelButtonText={labels.tools.deleteEsqlToolCancelButton}
            confirmButtonText={labels.tools.deleteEsqlToolConfirmButton}
            buttonColor="danger"
          >
            <EuiText>{labels.tools.deleteEsqlToolConfirmationText}</EuiText>
          </EuiConfirmModal>
        )}
        {isBulkDeleteToolsModalOpen && (
          <EuiConfirmModal
            title={labels.tools.bulkDeleteEsqlToolsTitle(bulkDeleteToolIds.length)}
            aria-labelledby={bulkDeleteEsqlToolsTitleId}
            titleProps={{ id: bulkDeleteEsqlToolsTitleId }}
            onCancel={cancelBulkDeleteTools}
            onConfirm={confirmBulkDeleteTools}
            isLoading={isBulkDeletingTools}
            cancelButtonText={labels.tools.deleteEsqlToolCancelButton}
            confirmButtonText={labels.tools.deleteEsqlToolConfirmButton}
            buttonColor="danger"
          >
            <EuiText>{labels.tools.bulkDeleteEsqlToolsConfirmationText}</EuiText>
          </EuiConfirmModal>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
