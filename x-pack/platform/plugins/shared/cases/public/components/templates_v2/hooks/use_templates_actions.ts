/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { stringify as yamlDump } from 'yaml';
import type { Template } from '../../../../common/types/domain/template/v1';
import { useCasesEditTemplateNavigation } from '../../../common/navigation';
import { useBulkDeleteTemplates } from './use_bulk_delete_templates';
import { useCreateTemplate } from './use_create_template';
import { useUpdateTemplate } from './use_update_template';
import { useBulkExportTemplates } from './use_bulk_export_templates';
import { useCasesToast } from '../../../common/use_cases_toast';
import {
  useTemplateCreatedEBT,
  useTemplateDeletedEBT,
  useTemplateUpdatedEBT,
} from '../../../analytics/templates';
import * as i18n from '../translations';

interface UseTemplatesActionsProps {
  onDeleteSuccess?: () => void;
}

export const useTemplatesActions = ({ onDeleteSuccess }: UseTemplatesActionsProps = {}) => {
  const { navigateToCasesEditTemplate } = useCasesEditTemplateNavigation();
  const { showSuccessToast } = useCasesToast();

  const reportTemplateCreated = useTemplateCreatedEBT();
  const reportTemplateUpdated = useTemplateUpdatedEBT();
  const reportTemplateDeleted = useTemplateDeletedEBT();

  const { mutate: bulkDeleteTemplates, isLoading: isDeleting } = useBulkDeleteTemplates({
    onSuccess: () => {
      // React Query awaits this hook-level callback whatever happens to the caller, but it runs a
      // per-call callback only while the caller still has listeners. Report here so that navigating
      // away mid-flight cannot drop the event. This hook instance always deletes one row.
      reportTemplateDeleted({ entryPoint: 'templates_list', deleteScope: 'single' });
      onDeleteSuccess?.();
    },
  });

  const { mutate: cloneTemplate, isLoading: isCloning } = useCreateTemplate({
    disableDefaultSuccessToast: true,
  });

  const { mutate: bulkExportTemplates, isLoading: isExporting } = useBulkExportTemplates();

  const { mutate: updateTemplate, isLoading: isUpdating } = useUpdateTemplate({
    disableDefaultSuccessToast: true,
  });

  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const handleEdit = useCallback(
    (template: Template) => {
      navigateToCasesEditTemplate({ templateId: template.templateId });
    },
    [navigateToCasesEditTemplate]
  );

  const handleClone = useCallback(
    (template: Template) => {
      const clonedName = i18n.CLONED_TEMPLATE_NAME_PREFIX(template.name);
      const clonedDefinition =
        typeof template.definition === 'string'
          ? template.definition
          : yamlDump(template.definition as Record<string, unknown>, { lineWidth: 0 }).trimEnd();

      cloneTemplate(
        {
          template: {
            name: clonedName,
            owner: template.owner,
            definition: clonedDefinition,
            description: template.description,
            tags: template.tags,
            isEnabled: template.isEnabled,
          },
        },
        {
          onSuccess: () => {
            // A clone is a create with a copied payload, so it reports the create event with a
            // distinct creation mode rather than an event of its own.
            reportTemplateCreated({ entryPoint: 'templates_list', creationMode: 'clone' });
            showSuccessToast(i18n.SUCCESS_CLONING_TEMPLATE(template.name));
          },
        }
      );
    },
    [cloneTemplate, showSuccessToast, reportTemplateCreated]
  );

  const handleExport = useCallback(
    (template: Template) => {
      bulkExportTemplates({ templateIds: [template.templateId] });
    },
    [bulkExportTemplates]
  );

  const handleDelete = useCallback((template: Template) => {
    setTemplateToDelete(template);
  }, []);

  const confirmDelete = useCallback(() => {
    if (templateToDelete) {
      bulkDeleteTemplates({ templateIds: [templateToDelete.templateId] });
      setTemplateToDelete(null);
    }
  }, [templateToDelete, bulkDeleteTemplates]);

  const cancelDelete = useCallback(() => {
    setTemplateToDelete(null);
  }, []);

  const handleIsEnabledChange = useCallback(
    (template: Template) => {
      updateTemplate(
        {
          templateId: template.templateId,
          template: { isEnabled: template.isEnabled === false },
        },
        {
          onSuccess: () => {
            reportTemplateUpdated({ entryPoint: 'templates_list' });
            showSuccessToast(i18n.SUCCESS_UPDATING_TEMPLATE);
          },
        }
      );
    },
    [updateTemplate, showSuccessToast, reportTemplateUpdated]
  );

  return {
    handleEdit,
    handleClone,
    handleExport,
    handleDelete,
    confirmDelete,
    cancelDelete,
    templateToDelete,
    isDeleting,
    isCloning,
    isExporting,
    isUpdating,
    handleIsEnabledChange,
  };
};
