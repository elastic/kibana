/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Template } from '../types';
import { useCasesEditTemplateNavigation } from '../../../common/navigation';

export const useTemplatesActions = () => {
  const { navigateToCasesEditTemplate } = useCasesEditTemplateNavigation();

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

  const handlePreview = useCallback((template: Template) => {
    // TODO: Implement preview functionality
    // eslint-disable-next-line no-console
    console.log('Preview template:', template);
  }, []);

  const handleDelete = useCallback((template: Template) => {
    // TODO: Implement delete functionality
    // eslint-disable-next-line no-console
    console.log('Delete template:', template);
  }, []);

  return {
    handleEdit,
    handleClone,
    handleSetAsDefault,
    handleExport,
    handlePreview,
    handleDelete,
  };
};
