/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiBasicTable,
  EuiSkeletonText,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Template } from '../../../../common/types/domain/template/v1';
import { useCasesCreateTemplateNavigation } from '../../../common/navigation/hooks';
import * as i18n from '../../templates/translations';
import { useTemplatesColumns } from '../hooks/use_templates_columns';
import { useTemplatesState } from '../hooks/use_templates_state';
import { useTemplatesPagination } from '../hooks/use_templates_pagination';
import { useGetTemplates } from '../hooks/use_get_templates';
import { useGetTemplateTags } from '../hooks/use_get_template_tags';
import { useGetTemplateCreators } from '../hooks/use_get_template_creators';
import { useTemplatesActions } from '../hooks/use_templates_actions';
import { TemplatesListHeader } from '../components/templates_list_header';
import { TemplatesTableFilters } from '../components/templates_table_filters';
import { TemplatesInfoPanel } from '../components/templates_info_panel';
import { TemplatesBulkActions } from '../components/templates_bulk_actions';
import { TemplatesTableEmptyPrompt } from '../components/templates_table_empty_prompt';
import { DeleteConfirmationModal } from '../../configure_cases/delete_confirmation_modal';

export const AllTemplatesPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { getCasesCreateTemplateUrl, navigateToCasesCreateTemplate } =
    useCasesCreateTemplateNavigation();

  const { queryParams, setQueryParams, sorting, selectedTemplates, selection, deselectTemplates } =
    useTemplatesState();

  const { data, isLoading, refetch } = useGetTemplates({ queryParams });
  const { data: tags = [], isLoading: isLoadingTags } = useGetTemplateTags();
  const { data: creators = [], isLoading: isLoadingCreators } = useGetTemplateCreators();
  const { pagination, onTableChange } = useTemplatesPagination({
    queryParams,
    setQueryParams,
    totalItemCount: data?.total ?? 0,
  });

  const handleDeleteSuccess = useCallback(() => {
    setQueryParams({ page: 1 });
  }, [setQueryParams]);

  const handleBulkActionSuccess = useCallback(() => {
    deselectTemplates();
    setQueryParams({ page: 1 });
  }, [deselectTemplates, setQueryParams]);

  const {
    handleEdit,
    handleClone,
    handleSetAsDefault,
    handleExport,
    handleDelete,
    confirmDelete,
    cancelDelete,
    templateToDelete,
  } = useTemplatesActions({ onDeleteSuccess: handleDeleteSuccess });

  const { columns } = useTemplatesColumns({
    onEdit: handleEdit,
    onClone: handleClone,
    onSetAsDefault: handleSetAsDefault,
    onExport: handleExport,
    onDelete: handleDelete,
    disableActions: selectedTemplates.length > 0,
  });

  const tableRowProps = useCallback(
    (template: Template) => ({
      'data-test-subj': `templates-table-row-${template.templateId}`,
    }),
    []
  );

  const isDataEmpty = data?.templates.length === 0;
  const isInitialLoading = isLoading && isDataEmpty;

  const hasFilters =
    queryParams.search.length > 0 || queryParams.tags.length > 0 || queryParams.author.length > 0;

  const handleClearFilters = useCallback(() => {
    setQueryParams({ search: '', tags: [], author: [], page: 1 });
  }, [setQueryParams]);

  const totalTemplates = pagination.totalItemCount;
  const rangeStart = totalTemplates > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const rangeEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalTemplates);

  return (
    <>
      <TemplatesListHeader />
      <TemplatesInfoPanel />
      <TemplatesTableFilters
        queryParams={queryParams}
        onQueryParamsChange={setQueryParams}
        onRefresh={refetch}
        isLoading={isLoading}
        availableTags={tags}
        availableCreatedBy={creators}
        isLoadingTags={isLoadingTags}
        isLoadingCreators={isLoadingCreators}
      />
      {isInitialLoading ? (
        <EuiSkeletonText data-test-subj="templates-table-loading" lines={10} />
      ) : (
        <>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
            css={css`
              border-bottom: ${euiTheme.border.thin};
              padding-top: ${euiTheme.size.s};
              padding-bottom: ${euiTheme.size.s};
            `}
          >
            <EuiFlexItem
              grow={false}
              data-test-subj="templates-table-count"
              css={css`
                border-right: ${euiTheme.border.thin};
                padding-right: ${euiTheme.size.s};
                padding-bottom: ${euiTheme.size.s};
                padding-top: ${euiTheme.size.s};
              `}
            >
              <EuiText size="xs" color="subdued">
                {i18n.SHOWING}{' '}
                <strong>
                  {rangeStart}
                  {'-'}
                  {rangeEnd}
                </strong>{' '}
                {i18n.SHOWING_TEMPLATES(totalTemplates)}
              </EuiText>
            </EuiFlexItem>
            <TemplatesBulkActions
              selectedTemplates={selectedTemplates}
              onActionSuccess={handleBulkActionSuccess}
            />
            {hasFilters && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={handleClearFilters}
                  size="xs"
                  iconSide="left"
                  iconType="cross"
                  flush="left"
                  data-test-subj="templates-clear-filters-link-icon"
                >
                  {i18n.CLEAR_FILTERS}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiBasicTable
            columns={columns}
            data-test-subj="templates-table"
            itemId="templateId"
            items={data?.templates ?? []}
            loading={isLoading}
            tableCaption={i18n.TEMPLATE_TITLE}
            noItemsMessage={
              <TemplatesTableEmptyPrompt
                hasFilters={hasFilters}
                onClearFilters={handleClearFilters}
                onCreateTemplate={navigateToCasesCreateTemplate}
                createTemplateUrl={getCasesCreateTemplateUrl()}
              />
            }
            onChange={onTableChange}
            pagination={pagination}
            rowProps={tableRowProps}
            selection={selection}
            sorting={sorting}
          />
        </>
      )}
      {templateToDelete && (
        <DeleteConfirmationModal
          title={i18n.DELETE_TITLE(templateToDelete.name)}
          message={i18n.DELETE_MESSAGE(templateToDelete.name)}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
};
AllTemplatesPage.displayName = 'AllTemplatesPage';

// eslint-disable-next-line import/no-default-export
export { AllTemplatesPage as default };
