/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCreateLiveQuery } from '../../live_queries/use_create_live_query_action';
import { useAllResults } from '../../results/use_all_results';
import { getQueryForPath } from './predefined_queries';
import type { FileData } from './file_table';
import type { AgentSelection } from '../../agents/types';
import { Direction } from '../../../common/search_strategy';

interface UseFileBrowserDataProps {
  agentId: string;
  queryType: string;
  path: string;
  searchTerm?: string;
  enabled?: boolean;
}

export const useFileBrowserData = ({
  agentId,
  queryType,
  path,
  searchTerm,
  enabled = true,
}: UseFileBrowserDataProps) => {
  const [actionId, setActionId] = useState<string>('');
  const [isQueryExecuting, setIsQueryExecuting] = useState(false);

  // Create agent selection object
  const agentSelection: AgentSelection = useMemo(() => ({
    agents: [agentId],
    allAgentsSelected: false,
    platformsSelected: [],
    policiesSelected: [],
  }), [agentId]);

  // Create live query mutation
  const createLiveQueryMutation = useCreateLiveQuery({
    onSuccess: () => {
      setIsQueryExecuting(false);
    },
  });

  // Get results using the existing useAllResults hook
  const {
    data: resultsData,
    isLoading: isResultsLoading,
    error: resultsError,
  } = useAllResults({
    actionId,
    activePage: 0,
    limit: 1000,
    sort: [{ field: '@timestamp', direction: Direction.desc }],
    skip: !actionId || !enabled,
    isLive: false,
  });

  // Execute query function
  const executeQuery = useCallback(() => {
    if (!agentId || !enabled) {
      return;
    }

    const query = getQueryForPath(queryType, path);
    setIsQueryExecuting(true);
    
    createLiveQueryMutation.mutate({
      query,
      agentSelection,
    });
  }, [agentId, queryType, path, enabled, agentSelection, createLiveQueryMutation]);

  // Execute query when parameters change
  useEffect(() => {
    // Reset action ID when parameters change
    setActionId('');
    executeQuery();
  }, [agentId, queryType, path, enabled]);

  // Set action ID when live query succeeds
  useEffect(() => {
    if (createLiveQueryMutation.data?.action_id) {
      setActionId(createLiveQueryMutation.data.action_id);
    }
  }, [createLiveQueryMutation.data]);

  // Process results into FileData format
  const processedData = useMemo<FileData[]>(() => {
    if (!resultsData?.edges) {
      return [];
    }

    const fileData: FileData[] = [];

    resultsData.edges.forEach((edge: any) => {
      const fields = edge.fields;
      
      if (fields) {
        const fileEntry: FileData = {
          path: fields['osquery.path'] || fields.path || '',
          filename: fields['osquery.filename'] || fields.filename || '',
          size: parseInt(fields['osquery.size'] || fields.size || '0', 10),
          mtime: parseInt(fields['osquery.mtime'] || fields.mtime || '0', 10),
          type: fields['osquery.type'] || fields.type || 'regular',
          file_type: (fields['osquery.type'] || fields.type) === 'directory' ? 'folder' : 'file',
          md5: fields['osquery.md5'] || fields.md5,
          sha256: fields['osquery.sha256'] || fields.sha256,
        };
        
        fileData.push(fileEntry);
      }
    });

    return fileData;
  }, [resultsData]);

  // Filter data by search term
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) {
      return processedData;
    }

    return processedData.filter(item =>
      item.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [processedData, searchTerm]);

  return {
    data: filteredData,
    isLoading: isQueryExecuting || isResultsLoading || createLiveQueryMutation.isLoading,
    error: resultsError || createLiveQueryMutation.error,
    refetch: executeQuery,
  };
};
