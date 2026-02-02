/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { Template } from '../types';
import { useCasesEditTemplateNavigation } from '../../../common/navigation';
import { useDeleteTemplate } from './use_delete_template';
import { useUpdateTemplate } from './use_update_template';
import { useCreateTemplate } from './use_create_template';
import { useExportTemplate } from './use_export_template';
import { useCasesToast } from '../../../common/use_cases_toast';
import * as i18n from '../../templates/translations';

interface UseTemplatesActionsProps {
  onDeleteSuccess?: () => void;
}

export const useTemplatesActions = ({ onDeleteSuccess }: UseTemplatesActionsProps = {}) => {
  const { navigateToCasesEditTemplate } = useCasesEditTemplateNavigation();
  const { showSuccessToast } = useCasesToast();
  const { mutate: deleteTemplate, isLoading: isDeleting } = useDeleteTemplate({
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

  const { mutate: exportTemplate, isLoading: isExporting } = useExportTemplate();

  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const handleEdit = useCallback(
    (template: Template) => {
      navigateToCasesEditTemplate({ templateId: template.key });
    },
    [navigateToCasesEditTemplate]
  );

  const handleClone = useCallback(
    (template: Template) => {
      cloneTemplate(
        {
          template: {
            name: i18n.CLONED_TEMPLATE_NAME_PREFIX(template.name),
            description: template.description,
            solution: template.solution,
            fields: template.fields,
            tags: template.tags,
            isDefault: false,
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
        templateId: template.key,
        template: { isDefault: true },
      });
    },
    [setDefaultTemplate]
  );

  const handleExport = useCallback(
    (template: Template) => {
      exportTemplate({ templateId: template.key });
    },
    [exportTemplate]
  );

  const handleDelete = useCallback((template: Template) => {
    setTemplateToDelete(template);
  }, []);

  const confirmDelete = useCallback(() => {
    if (templateToDelete) {
      deleteTemplate({ templateId: templateToDelete.key });
      setTemplateToDelete(null);
    }
  }, [templateToDelete, deleteTemplate]);

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
