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

interface UseTemplatesActionsProps {
  onDeleteSuccess?: () => void;
}

export const useTemplatesActions = ({ onDeleteSuccess }: UseTemplatesActionsProps = {}) => {
  const { navigateToCasesEditTemplate } = useCasesEditTemplateNavigation();
  const { mutate: deleteTemplate, isLoading: isDeleting } = useDeleteTemplate({
    onSuccess: onDeleteSuccess,
  });
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const handleEdit = useCallback(
    (template: Template) => {
      navigateToCasesEditTemplate({ templateId: template.key });
    },
    [navigateToCasesEditTemplate]
  );

  const handleClone = useCallback((template: Template) => {
    // TODO: Implement clone functionality
    // eslint-disable-next-line no-console
    console.log('Clone template:', template);
  }, []);

  const handleSetAsDefault = useCallback((template: Template) => {
    // TODO: Implement set as default functionality
    // eslint-disable-next-line no-console
    console.log('Set as default template:', template);
  }, []);

  const handleExport = useCallback((template: Template) => {
    // TODO: Implement export functionality
    // eslint-disable-next-line no-console
    console.log('Export template:', template);
  }, []);

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
  };
};
