/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileData } from '@kbn/langchain-deep-agent';

/**
 * Represents a node in the directory tree structure
 */
interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  fileData?: FileData;
}

/**
 * Builds a tree structure from file paths
 */
function buildTree(skills: Record<string, FileData>): TreeNode {
  const root: TreeNode = {
    name: '',
    children: new Map(),
  };

  for (const [filePath, fileData] of Object.entries(skills)) {
    // Remove leading slash and split path into segments
    const segments = filePath.replace(/^\//, '').split('/').filter(Boolean);
    
    let currentNode = root;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isFile = i === segments.length - 1;
      
      if (!currentNode.children.has(segment)) {
        currentNode.children.set(segment, {
          name: segment,
          children: new Map(),
        });
      }
      
      const childNode = currentNode.children.get(segment)!;
      
      if (isFile) {
        // Store file data on the leaf node
        childNode.fileData = fileData;
      }
      
      currentNode = childNode;
    }
  }

  return root;
}

/**
 * Formats a tree node and its children as a string representation
 */
function formatTreeNode(
  node: TreeNode,
  indent: string = ''
): string {
  const lines: string[] = [];
  
  // Format the current node
  if (node.name) {
    const isDirectory = node.fileData === undefined;
    const directorySuffix = isDirectory ? '/' : '';
    const description = node.fileData?.description 
      ? ` - ${node.fileData.description}` 
      : '';
    lines.push(`${indent}${node.name}${directorySuffix}${description}`);
  }
  
  // Sort children for consistent output (directories first, then files)
  const sortedChildren = Array.from(node.children.entries()).sort(([a], [b]) => {
    const aIsFile = node.children.get(a)?.fileData !== undefined;
    const bIsFile = node.children.get(b)?.fileData !== undefined;
    
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return a.localeCompare(b);
  });
  
  // Format children with increased indentation
  const nextIndent = indent + '    ';
  for (const [childName, childNode] of sortedChildren) {
    lines.push(formatTreeNode(childNode, nextIndent));
  }
  
  return lines.join('\n');
}

/**
 * Converts a record of skills (file paths to FileData) into a string representation
 * of the directory tree structure.
 * 
 * Example output:
 * /
 *   skills/
 *     security/
 *       get_alerts.md - Knowledge and guidance for retrieving security alerts
 *     platform/
 *       core/
 *         search.md - Search functionality documentation
 * 
 * @param skills - Record mapping file paths to FileData objects
 * @returns String representation of the directory tree
 */
export function formatSkillsDirectoryTree(skills: Record<string, FileData>): string {
  if (Object.keys(skills).length === 0) {
    return '';
  }

  const tree = buildTree(skills);
  
  // Start with root directory
  let result = '/\n';
  
  // Format all children of root
  const sortedChildren = Array.from(tree.children.entries()).sort(([a], [b]) => {
    const aIsFile = tree.children.get(a)?.fileData !== undefined;
    const bIsFile = tree.children.get(b)?.fileData !== undefined;
    
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return a.localeCompare(b);
  });
  
  for (const [childName, childNode] of sortedChildren) {
    result += formatTreeNode(childNode, '    '); // 4 spaces indent for root children
  }
  
  return result;
}

