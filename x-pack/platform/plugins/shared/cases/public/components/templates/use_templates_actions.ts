/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Template } from './sample_data';

export interface UseTemplatesActionsReturnValue {
  handleEdit: (template: Template) => void;
  handleDelete: (template: Template) => void;
}

export const useTemplatesActions = (): UseTemplatesActionsReturnValue => {
  const handleEdit = useCallback((template: Template) => {
    // TODO: Implement edit functionality
    // eslint-disable-next-line no-console
    console.log('Edit template:', template);
  }, []);

  const handleDelete = useCallback((template: Template) => {
    // TODO: Implement delete functionality
    // eslint-disable-next-line no-console
    console.log('Delete template:', template);
  }, []);

  return {
    handleEdit,
    handleDelete,
  };
};
