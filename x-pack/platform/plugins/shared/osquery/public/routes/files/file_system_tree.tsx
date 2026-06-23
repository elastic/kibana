/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, EuiCallOut, EuiText, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRoots } from './use_list_directory';
import { DirectoryTreeNode } from './directory_tree_node';
import type { TreeNode } from './directory_tree_node';
import type { HostCapability } from './use_host_capability';

interface FileSystemTreeProps {
  agentId: string;
  osFamily?: string;
  capability?: HostCapability;
}

const FileSystemTreeComponent: React.FC<FileSystemTreeProps> = ({
  agentId,
  osFamily,
  capability,
}) => {
  const { rows, isLoading, isError } = useRoots({ agentId, osFamily });

  const rootNodes = useMemo<TreeNode[]>(
    () =>
      rows.map((row) => ({
        path: row.path ?? '',
        filename: row.path ?? '',
        isDirectory: true,
      })),
    [rows]
  );

  if (isLoading) {
    return (
      <EuiPanel paddingSize="l" data-test-subj="fileSystemTreeLoading">
        <EuiLoadingSpinner size="m" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.osquery.fileSystem.tree.loadingRoots"
            defaultMessage="Discovering file system roots..."
          />
        </EuiText>
      </EuiPanel>
    );
  }

  if (isError) {
    return (
      <EuiCallOut
        color="danger"
        iconType="warning"
        title={
          <FormattedMessage
            id="xpack.osquery.fileSystem.tree.rootsError"
            defaultMessage="Could not load file system roots"
          />
        }
        data-test-subj="fileSystemTreeError"
      >
        <FormattedMessage
          id="xpack.osquery.fileSystem.tree.rootsErrorBody"
          defaultMessage="The host may be offline or Osquery unavailable."
        />
      </EuiCallOut>
    );
  }

  if (rootNodes.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="fileSystemTreeEmpty">
        <FormattedMessage
          id="xpack.osquery.fileSystem.tree.noRoots"
          defaultMessage="No file system roots found for this host."
        />
      </EuiText>
    );
  }

  return (
    <EuiPanel paddingSize="s" data-test-subj="fileSystemTree">
      {rootNodes.map((node) => (
        <DirectoryTreeNode
          key={node.path}
          agentId={agentId}
          node={node}
          depth={0}
          capability={capability}
        />
      ))}
    </EuiPanel>
  );
};

export const FileSystemTree = React.memo(FileSystemTreeComponent);
