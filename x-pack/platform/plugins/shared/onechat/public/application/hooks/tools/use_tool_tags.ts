/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useToolsService } from './use_tools';

export interface UseToolTagsProps {
  includeSystemTools?: boolean;
}

export const useToolsTags = ({ includeSystemTools }: UseToolTagsProps = {}) => {
  const { tools, isLoading, error } = useToolsService({ includeSystemTools });

  const tags = useMemo((): string[] => {
    if (isLoading || error) return [];

    // Return unique tags across all tools
    return [
      ...tools.reduce((tagsSet, tool) => {
        tool.tags.forEach((tag) => tagsSet.add(tag));
        return tagsSet;
      }, new Set<string>()),
    ];
  }, [tools, isLoading, error]);

  return { tags, isLoading };
};
