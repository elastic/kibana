/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  EuiPanel,
  EuiCallOut,
  EuiCode,
  EuiSkeletonText,
  EuiProgress,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

import { useAllResults } from '../../results/use_all_results';
import { useActionResults } from '../../action_results/use_action_results';
import { useActionResultsPrivileges } from '../../action_results/use_action_privileges';
import { Direction } from '../../../common/search_strategy';
import { generateEmptyDataMessage } from '../../results/translations';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';

const euiProgressCss = {
  marginTop: '-2px',
};

export interface FileTreeProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  ecsMapping?: ECSMapping;
  endDate?: string;
  startDate?: string;
  liveQueryActionId?: string;
  error?: string;
  onPathNavigation?: (path: string) => void;
}

interface FileTreeNode {
  id: string;
  label: string;
  icon?: string;
  iconWhenExpanded?: string;
  isExpanded?: boolean;
  children?: FileTreeNode[];
  path: string;
  size?: number;
  mtime?: number;
  type: 'file' | 'directory';
  md5?: string;
  sha256?: string;
}

const FileTreeComponent: React.FC<FileTreeProps> = ({
  actionId,
  agentIds,
  ecsMapping,
  startDate,
  endDate,
  liveQueryActionId,
  error,
  onPathNavigation,
}) => {
  const [isLive, setIsLive] = useState(true);
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);
  const { data: hasActionResultsPrivileges } = useActionResultsPrivileges();

  const {
    // @ts-expect-error update types
    data: { aggregations },
  } = useActionResults({
    actionId,
    startDate,
    activePage: 0,
    agentIds,
    limit: 0,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
    skip: !hasActionResultsPrivileges,
  });

  const [pagination] = useState({ pageIndex: 0, pageSize: 1000 });
  const [sortingColumns] = useState([
    {
      id: 'agent.name',
      direction: Direction.asc,
    },
  ]);

  const { data: allResultsData, isLoading } = useAllResults({
    actionId,
    startDate,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    isLive,
    sort: sortingColumns.map((sortedColumn) => ({
      field: sortedColumn.id,
      direction: sortedColumn.direction as Direction,
    })),
    skip: !hasActionResultsPrivileges,
  });

  const fileTreeData = useMemo<FileTreeNode[]>(() => {
    if (!allResultsData?.edges) {
      return [];
    }

    const rootNodes: FileTreeNode[] = [];

    // Debug: Log the actual response to see what fields we're getting
    console.log('FileTree - Raw osquery response:', allResultsData.edges[0]?.fields);

    allResultsData.edges.forEach((edge: any) => {
      const fields = edge.fields;
      
      if (fields) {
        // Extract first element from arrays - osquery returns array values
        const fullPath = String(
          fields['osquery.path']?.[0] || 
          fields.path?.[0] || 
          ''
        );
        
        const filename = String(
          fields['osquery.filename']?.[0] || 
          fields.filename?.[0] ||
          fields['osquery.name']?.[0] ||
          fields.name?.[0] ||
          fullPath.split(/[\/\\]/).pop() ||
          'Unknown'
        );
        
        const size = parseInt(fields['osquery.size']?.[0] || fields.size?.[0] || '0', 10);
        const mtime = parseInt(fields['osquery.mtime']?.[0] || fields.mtime?.[0] || '0', 10);
        const type = String(fields['osquery.type']?.[0] || fields.type?.[0] || 'regular');
        const isDirectory = type === 'directory' || fields['osquery.is_directory']?.[0] === '1';
        
        // Debug: Log the extracted values
        console.log('FileTree - Extracted values:', {
          filename,
          fullPath,
          type,
          isDirectory,
          rawFilename: fields['osquery.filename']?.[0],
          rawPath: fields['osquery.path']?.[0]
        });
        
        // Skip if no valid path or filename
        if (!fullPath || fullPath === '' || !filename || filename === '') {
          return;
        }
        
        const nodeId = fullPath || filename;
        
        // Simplified label without emojis to debug text corruption
        const label = isDirectory 
          ? `${filename} (directory, ${size} bytes)`
          : `${filename} (file, ${size} bytes)`;
        
        const node: FileTreeNode = {
          id: `${nodeId}-${Date.now()}-${Math.random()}`, // Ensure unique IDs
          label: String(label).trim(), // Ensure clean string
          icon: isDirectory ? 'folderClosed' : 'document',
          iconWhenExpanded: 'folderOpen',
          path: String(fullPath).trim(),
          size,
          mtime,
          type: isDirectory ? 'directory' : 'file',
          md5: fields['osquery.md5']?.[0] || fields.md5?.[0],
          sha256: fields['osquery.sha256']?.[0] || fields.sha256?.[0],
          children: isDirectory ? [] : undefined,
        };
        
        rootNodes.push(node);
      }
    });

    // Sort nodes: directories first, then files
    rootNodes.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.label.localeCompare(b.label);
    });

    return rootNodes;
  }, [allResultsData]);

  const onNodeClick = useCallback(
    (node: FileTreeNode) => {
      if (node.type === 'directory') {
        const isExpanded = expandedNodeIds.includes(node.id);
        if (isExpanded) {
          // Collapse directory - local operation only
          setExpandedNodeIds((prev) => prev.filter((id) => id !== node.id));
        } else {
          // Expand directory - local operation only
          setExpandedNodeIds((prev) => [...prev, node.id]);
          // NOTE: Removed onPathNavigation call that was causing refetching
        }
      }
    },
    [expandedNodeIds]
  );

  const buildTreeStructure = useCallback((files: FileTreeNode[]) => {
    const pathMap = new Map<string, FileTreeNode>();
    const rootNodes: FileTreeNode[] = [];

    // Sort files to process directories first
    const sortedFiles = [...files].sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.path.localeCompare(b.path);
    });

    sortedFiles.forEach((file) => {
      const pathParts = file.path.split('/').filter(Boolean);
      
      if (pathParts.length === 1) {
        // Root level file/directory
        rootNodes.push({
          ...file,
          children: file.type === 'directory' ? [] : undefined
        });
        pathMap.set(file.path, file);
      } else {
        // Nested file/directory - find parent
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = pathMap.get('/' + parentPath) || pathMap.get(parentPath);
        
        if (parent && parent.children) {
          parent.children.push({
            ...file,
            children: file.type === 'directory' ? [] : undefined
          });
        }
        pathMap.set(file.path, file);
      }
    });

    return rootNodes;
  }, []);

  const renderTreeNode = useCallback((node: FileTreeNode, level: number = 0): React.ReactElement => {
    const isExpanded = expandedNodeIds.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id}>
        <div
          style={{
            padding: '8px',
            paddingLeft: `${8 + level * 20}px`,
            borderBottom: '1px solid #eee',
            cursor: node.type === 'directory' ? 'pointer' : 'default',
            backgroundColor: isExpanded ? '#f7f9fc' : 'transparent'
          }}
          onClick={() => onNodeClick(node)}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {node.type === 'directory' && (
              <EuiFlexItem grow={false}>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {isExpanded ? '📂' : '📁'}
                </span>
              </EuiFlexItem>
            )}
            {node.type === 'file' && (
              <EuiFlexItem grow={false}>
                <span style={{ fontSize: '12px' }}>📄</span>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiText size="s" style={{ fontFamily: 'monospace' }}>
                {node.label}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        
        {/* Render children if expanded */}
        {node.type === 'directory' && isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedNodeIds, onNodeClick]);

  const treeStructure = useMemo(() => buildTreeStructure(fileTreeData), [fileTreeData, buildTreeStructure]);

  useEffect(
    () =>
      setIsLive(() => {
        if (!agentIds?.length || error) return false;

        return !!(
          aggregations.totalResponded !== agentIds?.length ||
          allResultsData?.total !== aggregations?.totalRowCount ||
          (allResultsData?.total && !allResultsData?.edges.length)
        );
      }),
    [
      agentIds?.length,
      aggregations.totalResponded,
      aggregations?.totalRowCount,
      allResultsData?.edges.length,
      allResultsData?.total,
      error,
    ]
  );

  if (isLoading) {
    return <EuiSkeletonText lines={5} />;
  }

  if (!hasActionResultsPrivileges) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.osquery.liveQuery.permissionDeniedPromptTitle"
            defaultMessage="Permission denied"
          />
        }
        color="danger"
        iconType="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.osquery.liveQuery.permissionDeniedPromptBody"
            defaultMessage="To view query results, ask your administrator to update your user role to have index {read} privileges on the {logs} index."
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            values={{
              read: <EuiCode>read</EuiCode>,
              logs: <EuiCode>logs-{OSQUERY_INTEGRATION_NAME}.result*</EuiCode>,
            }}
          />
        </p>
      </EuiCallOut>
    );
  }

  return (
    <>
      {isLive && <EuiProgress color="primary" size="xs" css={euiProgressCss} />}

      {!allResultsData?.edges.length ? (
        <EuiPanel hasShadow={false} data-test-subj={'osqueryFileTreePanel'}>
          <EuiCallOut title={generateEmptyDataMessage(aggregations.totalResponded)} />
        </EuiPanel>
      ) : (
        <EuiPanel hasShadow={false} paddingSize="m">
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.osquery.fileTree.totalFiles"
                  defaultMessage="{count} files and directories found"
                  values={{ count: allResultsData.total }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                {treeStructure.map((node) => renderTreeNode(node))}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </>
  );
};

export const FileTree = React.memo(FileTreeComponent);
