/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import type { Template } from '../../../../common/types/domain/template/v1';
import { useCasesEditTemplateNavigation } from '../../../common/navigation';
import { useBulkDeleteTemplates } from './use_bulk_delete_templates';
import { useUpdateTemplate } from './use_update_template';
import { useCreateTemplate } from './use_create_template';
import { useBulkExportTemplates } from './use_bulk_export_templates';
import { useCasesToast } from '../../../common/use_cases_toast';
import * as i18n from '../../templates/translations';

interface UseTemplatesActionsProps {
  onDeleteSuccess?: () => void;
}

export const useTemplatesActions = ({ onDeleteSuccess }: UseTemplatesActionsProps = {}) => {
  const { navigateToCasesEditTemplate } = useCasesEditTemplateNavigation();
  const { showSuccessToast } = useCasesToast();
  const { mutate: bulkDeleteTemplates, isLoading: isDeleting } = useBulkDeleteTemplates({
    onSuccess: onDeleteSuccess,
  });

  const { mutate: setDefaultTemplate, isLoading: isSettingDefault } = useUpdateTemplate({
    disableDefaultSuccessToast: true,
    onSuccess: (data) => {
      showSuccessToast(i18n.SUCCESS_SET_AS_DEFAULT_TEMPLATE(data.name));
    },
  });

  const { mutate: cloneTemplate, isLoading: isCloning } = useCreateTemplate({
    disableDefaultSuccessToast: true,
  });

  const { mutate: bulkExportTemplates, isLoading: isExporting } = useBulkExportTemplates();

  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const handleEdit = useCallback(
    (template: Template) => {
      navigateToCasesEditTemplate({ templateId: template.templateId });
    },
    [navigateToCasesEditTemplate]
  );

  const handleClone = useCallback(
    (template: Template) => {
      // The list endpoint returns definition as a parsed object (via parseTemplate),
      // but the create endpoint expects a YAML string. Parse if needed, update the
      // name, then re-serialize to YAML.
      const parsed =
        typeof template.definition === 'string'
          ? (yamlLoad(template.definition) as Record<string, unknown>)
          : (template.definition as Record<string, unknown>);

      const clonedDefinition = yamlDump(
        { ...parsed, name: i18n.CLONED_TEMPLATE_NAME_PREFIX(template.name) },
        { lineWidth: -1 }
      ).trimEnd();

      cloneTemplate(
        {
          template: {
            owner: template.owner,
            definition: clonedDefinition,
            description: template.description,
            tags: template.tags,
          },
        },
        {
          onSuccess: () => {
            showSuccessToast(i18n.SUCCESS_CLONING_TEMPLATE(template.name));
          },
        }
      );
    },
    [cloneTemplate, showSuccessToast]
  );

  const handleSetAsDefault = useCallback(
    (template: Template) => {
      setDefaultTemplate({
        templateId: template.templateId,
        template: { isDefault: true },
      });
    },
    [setDefaultTemplate]
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

  return {
    handleEdit,
    handleClone,
    handleSetAsDefault,
    handleExport,
    handleDelete,
    confirmDelete,
    cancelDelete,
    templateToDelete,
    isDeleting,
    isSettingDefault,
    isCloning,
    isExporting,
  };
};
