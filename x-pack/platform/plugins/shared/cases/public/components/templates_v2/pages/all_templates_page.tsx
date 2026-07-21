/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBasicTable, EuiSkeletonText } from '@elastic/eui';
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
import { PAGE_TITLE } from '../../../common/translations';
import {
  useAllCasesNavigation,
  useCasesCreateTemplateNavigation,
  useCasesFieldLibraryNavigation,
} from '../../../common/navigation/hooks';
import { useCasesTemplatesBreadcrumbs } from '../../use_breadcrumbs';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from '../translations';
import { useTemplatesColumns } from '../hooks/use_templates_columns';
import { useTemplatesState } from '../hooks/use_templates_state';
import { useTemplatesPagination } from '../hooks/use_templates_pagination';
import { useGetTemplates } from '../hooks/use_get_templates';
import { useGetTemplateTags } from '../hooks/use_get_template_tags';
import { useGetTemplateCreators } from '../hooks/use_get_template_creators';
import { useTemplatesActions } from '../hooks/use_templates_actions';
import { getTemplatesListMenu } from '../components/header_menu';
import { TemplateFlyout } from '../components/template_flyout';
import { TemplatesTableFilters } from '../components/templates_table_filters';
import { TemplatesInfoPanel } from '../components/templates_info_panel';
import { TemplatesTableSettings } from '../components/templates_table_settings';
import { TemplatesTableEmptyPrompt } from '../components/templates_table_empty_prompt';
import { DeleteConfirmationModal } from '../../configure_cases/delete_confirmation_modal';
import { CasesAppHeader } from '../../app/cases_app_header';
import { CasesPageBody } from '../../app/cases_page_body';
import { GuidedTour } from '../../tour/guided_tour';
import { TEMPLATES_TOUR_STEPS } from '../tour/tour_steps_config';
import { TEMPLATES_TOUR_STEP_TEST_ID } from '../tour/constants';
import { useKibana } from '../../../common/lib/kibana';

export const AllTemplatesPage: React.FC = () => {
  useCasesTemplatesBreadcrumbs();
  const { owner } = useCasesContext();
  const { docLinks } = useKibana().services;
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();
  const { getCasesCreateTemplateUrl, navigateToCasesCreateTemplate } =
    useCasesCreateTemplateNavigation();
  const { getCasesFieldLibraryUrl, navigateToCasesFieldLibrary } = useCasesFieldLibraryNavigation();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  const startTour = useCallback(() => setIsTourActive(true), []);
  const finishTour = useCallback(() => setIsTourActive(false), []);

  const openFlyout = useCallback(() => {
    setIsFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, []);

  const templatesListMenu = useMemo(
    () =>
      getTemplatesListMenu({
        onImportClick: openFlyout,
        navigateToCasesCreateTemplate,
        getCasesCreateTemplateUrl,
        navigateToCasesFieldLibrary,
        getCasesFieldLibraryUrl,
      }),
    [
      getCasesCreateTemplateUrl,
      getCasesFieldLibraryUrl,
      navigateToCasesCreateTemplate,
      navigateToCasesFieldLibrary,
      openFlyout,
    ]
  );

  const templatesListBack = useMemo(
    () => ({
      href: getAllCasesUrl(),
      label: PAGE_TITLE,
      // AppHeader's back button keeps its `href` on the rendered anchor, so the default
      // navigation must be prevented here to avoid a full page reload alongside the SPA one.
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        navigateToAllCases();
      },
    }),
    [getAllCasesUrl, navigateToAllCases]
  );

  const { queryParams, setQueryParams, sorting, selectedTemplates, selection, deselectTemplates } =
    useTemplatesState();

  const { data, isLoading, refetch } = useGetTemplates({
    queryParams: { ...queryParams, owner },
  });
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
    handleExport,
    handleDelete,
    confirmDelete,
    cancelDelete,
    templateToDelete,
    handleIsEnabledChange,
  } = useTemplatesActions({ onDeleteSuccess: handleDeleteSuccess });

  const { columns } = useTemplatesColumns({
    onEdit: handleEdit,
    onClone: handleClone,
    onExport: handleExport,
    onDelete: handleDelete,
    disableActions: selectedTemplates.length > 0,
    onIsEnabledChange: handleIsEnabledChange,
  });

  const tableRowProps = useCallback(
    (template: TemplateListItem) => ({
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
      <CasesAppHeader
        title={i18n.TEMPLATE_TITLE}
        back={templatesListBack}
        menu={templatesListMenu}
        // Native "Documentation" item in the header overflow menu, linking to the case-templates
        // guide via the doclinks service (kept consistent with the template editor header).
        docLink={docLinks.links.cases.manageCaseTemplates}
      />
      <GuidedTour
        steps={TEMPLATES_TOUR_STEPS}
        isActive={isTourActive}
        onFinish={finishTour}
        testIdPrefix={TEMPLATES_TOUR_STEP_TEST_ID}
      />
      <CasesPageBody>
        <TemplatesInfoPanel onStartTour={startTour} />
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
            <TemplatesTableSettings
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              totalTemplates={totalTemplates}
              selectedTemplates={selectedTemplates}
              onBulkActionSuccess={handleBulkActionSuccess}
              hasFilters={hasFilters}
              onClearFilters={handleClearFilters}
            />
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
        {isFlyoutOpen && <TemplateFlyout onClose={closeFlyout} onImport={closeFlyout} />}
      </CasesPageBody>
    </>
  );
};
AllTemplatesPage.displayName = 'AllTemplatesPage';

// eslint-disable-next-line import/no-default-export
export { AllTemplatesPage as default };
