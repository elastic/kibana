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
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../templates/translations';
import { LinkButton } from '../links';
import { useCasesCreateTemplateNavigation } from '../../common/navigation';
import type { Template } from './sample_data';
import { useTemplatesColumns } from './use_templates_columns';
import { useTemplatesState } from './use_templates_state';
import { useTemplatesPagination } from './use_templates_pagination';
import { useGetTemplates } from './use_get_templates';
import { useTemplatesActions } from './use_templates_actions';
import { TemplatesListHeader } from './templates_list_header';

interface Props {
  props: { test: string };
}
export const AllTemplatesPage: React.FC<Props> = ({ props }) => {
  const { euiTheme } = useEuiTheme();
  const { getCasesCreateTemplateUrl, navigateToCasesCreateTemplate } =
    useCasesCreateTemplateNavigation();

  const { queryParams, setQueryParams, sorting, selectedTemplates, selection } =
    useTemplatesState();

  const { data, isLoading } = useGetTemplates({
    page: queryParams.page,
    perPage: queryParams.perPage,
  });

  const { pagination, onTableChange } = useTemplatesPagination({
    queryParams,
    setQueryParams,
    totalItemCount: data?.total ?? 0,
  });

  const { handleEdit, handleClone, handleSetAsDefault, handleExport, handlePreview, handleDelete } =
    useTemplatesActions();

  const { columns } = useTemplatesColumns({
    onEdit: handleEdit,
    onClone: handleClone,
    onSetAsDefault: handleSetAsDefault,
    onExport: handleExport,
    onPreview: handlePreview,
    onDelete: handleDelete,
    disableActions: selectedTemplates.length > 0,
  });

  const tableRowProps = useCallback(
    (template: Template) => ({
      'data-test-subj': `templates-table-row-${template.key}`,
    }),
    []
  );

  const isDataEmpty = data?.templates.length === 0;
  const isInitialLoading = isLoading && isDataEmpty;

  const totalTemplates = pagination.totalItemCount;
  const rangeStart = pagination.pageIndex * pagination.pageSize + 1;
  const rangeEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalTemplates);

  return (
    <>
      <TemplatesListHeader />

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
            <EuiFlexItem grow={false} data-test-subj="templates-table-count">
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
          </EuiFlexGroup>
          <EuiBasicTable
            columns={columns}
            data-test-subj="templates-table"
            itemId="key"
            items={data?.templates ?? []}
            loading={isLoading}
            tableCaption={i18n.TEMPLATE_TITLE}
            noItemsMessage={
              <EuiEmptyPrompt
                title={<h3>{i18n.NO_TEMPLATES}</h3>}
                titleSize="xs"
                body={i18n.TEMPLATE_DESCRIPTION}
                actions={
                  <LinkButton
                    fill
                    size="s"
                    onClick={navigateToCasesCreateTemplate}
                    href={getCasesCreateTemplateUrl()}
                    iconType="plusInCircle"
                    data-test-subj="templates-table-add-template"
                  >
                    {i18n.CREATE_TEMPLATE}
                  </LinkButton>
                }
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
    </>
  );
};
AllTemplatesPage.displayName = 'AllTemplatesPage';
