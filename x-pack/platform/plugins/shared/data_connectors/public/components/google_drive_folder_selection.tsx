/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiTreeView,
} from '@elastic/eui';
import { getConnectorIconPath } from '../pages/data_connectors_landing';

export interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[]; // Array of parent folder IDs
}

interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
  isExpanded: boolean;
  isLoading: boolean;
  hasLoaded: boolean; // Whether we've attempted to load children
}

export interface GoogleDriveFolderSelectionProps {
  connectorId: string;
  onClose: () => void;
  onSave: (allowedFolders: string[] | null) => Promise<void>; // null means "all folders"
}

export const GoogleDriveFolderSelection: React.FC<GoogleDriveFolderSelectionProps> = ({
  connectorId,
  onClose,
  onSave,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderTree, setFolderTree] = useState<Map<string, FolderNode>>(new Map());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { services } = useKibana();
  const httpClient = services.http;

  const loadExistingFolderSelection = useCallback(async () => {
    try {
      if (!httpClient || !connectorId) {
        return;
      }

      // Fetch connector to get existing folder selection
      const connectorResponse = await httpClient.get<{
        id: string;
        config?: { allowedFolders?: string[] | null };
      }>(`/api/workplace_connectors/${connectorId}`);

      const allowedFolders = connectorResponse.config?.allowedFolders;
      if (allowedFolders === null) {
        // "All folders" is selected
        setSelectAll(true);
      } else if (Array.isArray(allowedFolders) && allowedFolders.length > 0) {
        // Specific folders are selected
        setSelectedFolders(new Set(allowedFolders));
        setSelectAll(false);
      }
    } catch (err) {
      // Ignore errors when loading existing selection
      console.warn('Failed to load existing folder selection:', err);
    }
  }, [httpClient, connectorId]);

  // Get access token once
  const getAccessToken = useCallback(async (): Promise<string> => {
    if (accessToken) {
      return accessToken;
    }

    if (!httpClient) {
      throw new Error('HTTP client not available');
    }

    const tokenResponse = await httpClient.get<{ accessToken: string }>(
      `/api/workplace_connectors/${connectorId}/access-token`
    );

    setAccessToken(tokenResponse.accessToken);
    return tokenResponse.accessToken;
  }, [httpClient, connectorId, accessToken]);

  // Fetch folders for a specific parent folder (or root if parentId is null)
  const fetchFoldersForParent = useCallback(
    async (parentId: string | null = null): Promise<GoogleDriveFolder[]> => {
      const token = await getAccessToken();
      const folders: GoogleDriveFolder[] = [];
      let pageToken: string | undefined;

      do {
        // Build query: only folders, not trashed, and optionally in a specific parent
        let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
        if (parentId) {
          query += ` and '${parentId}' in parents`;
        } else {
          // Top-level folders: parent is 'root' (My Drive root)
          // Note: For shared drives, we'd need to query each drive separately
          query += " and 'root' in parents";
        }

        const params: Record<string, any> = {
          q: query,
          pageSize: 100,
          fields: 'nextPageToken,files(id,name,mimeType,parents)',
        };

        // Only include shared drive parameters when querying root (to avoid conflicts)
        if (!parentId) {
          params.corpora = 'allDrives';
          params.includeItemsFromAllDrives = true;
          params.supportsAllDrives = true;
        } else {
          // For specific folder queries, we still want to support shared drives
          params.includeItemsFromAllDrives = true;
          params.supportsAllDrives = true;
        }

        if (pageToken) {
          params.pageToken = pageToken;
        }

        // Call Google Drive API directly using browser fetch
        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString();

        const apiResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?${queryString}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!apiResponse.ok) {
          throw new Error(
            `Google Drive API error: ${apiResponse.status} ${apiResponse.statusText}`
          );
        }

        const data = await apiResponse.json();

        if (data.files) {
          folders.push(
            ...data.files.map((f: any) => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              parents: f.parents || [],
            }))
          );
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      return folders;
    },
    [getAccessToken]
  );

  // Initialize folder tree with top-level folders
  const initializeFolderTree = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const topLevelFolders = await fetchFoldersForParent(null);

      // Build initial tree structure - only top-level folders
      const tree = new Map<string, FolderNode>();
      topLevelFolders.forEach((folder) => {
        tree.set(folder.id, {
          id: folder.id,
          name: folder.name,
          isExpanded: false,
          isLoading: false,
          hasLoaded: false,
        });
      });

      setFolderTree(tree);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch folders');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFoldersForParent]);

  useEffect(() => {
    initializeFolderTree();
    loadExistingFolderSelection();
  }, [connectorId, initializeFolderTree, loadExistingFolderSelection]);

  // Load children for a folder when expanded
  const loadFolderChildren = useCallback(
    async (folderId: string) => {
      const tree = new Map(folderTree);
      const folder = tree.get(folderId);

      if (!folder || folder.hasLoaded) {
        return; // Already loaded or doesn't exist
      }

      // Mark as loading
      tree.set(folderId, { ...folder, isLoading: true });
      setFolderTree(new Map(tree));

      try {
        const children = await fetchFoldersForParent(folderId);

        // Add children to tree first
        const childNodes: FolderNode[] = [];
        children.forEach((child) => {
          if (!tree.has(child.id)) {
            const childNode: FolderNode = {
              id: child.id,
              name: child.name,
              isExpanded: false,
              isLoading: false,
              hasLoaded: false,
            };
            tree.set(child.id, childNode);
            childNodes.push(childNode);
          } else {
            childNodes.push(tree.get(child.id)!);
          }
        });

        // Update folder with children references
        tree.set(folderId, {
          ...folder,
          children: childNodes,
          isLoading: false,
          hasLoaded: true,
        });

        setFolderTree(new Map(tree));
      } catch (err) {
        setError((err as Error).message || `Failed to load children for folder ${folder.name}`);
        // Reset loading state on error
        tree.set(folderId, { ...folder, isLoading: false });
        setFolderTree(new Map(tree));
      }
    },
    [folderTree, fetchFoldersForParent]
  );

  const handleToggleFolder = (folderId: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setSelectedFolders(newSelected);
    setSelectAll(false); // Uncheck "All" if manually selecting folders
  };

  const handleToggleExpand = (folderId: string) => {
    const tree = new Map(folderTree);
    const folder = tree.get(folderId);

    if (!folder) return;

    const newExpanded = !folder.isExpanded;
    tree.set(folderId, { ...folder, isExpanded: newExpanded });
    setFolderTree(new Map(tree));

    // Load children if expanding for the first time
    if (newExpanded && !folder.hasLoaded) {
      loadFolderChildren(folderId);
    }
  };

  // Convert folder tree to EuiTreeView format
  const buildTreeViewItems = (): any[] => {
    // Get top-level folders - these are folders that were initially loaded (no parent)
    // We track this by checking if they have children defined or if they're in the initial set
    const allFolders = Array.from(folderTree.values());

    // Find folders that are children of other folders
    const childFolderIds = new Set<string>();
    allFolders.forEach((folder) => {
      if (folder.children) {
        folder.children.forEach((child) => {
          childFolderIds.add(child.id);
        });
      }
    });

    // Top-level folders are those that are not children of any other folder
    const topLevelFolders = allFolders.filter((folder) => !childFolderIds.has(folder.id));

    const buildNode = (node: FolderNode): any => {
      const isSelected = selectedFolders.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      return {
        id: node.id,
        label: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id={`folder-${node.id}`}
                checked={isSelected}
                onChange={() => handleToggleFolder(node.id)}
                onClick={(e) => e.stopPropagation()}
                label={node.name}
              />
            </EuiFlexItem>
            {node.isLoading && (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        icon: <EuiIcon type={node.isExpanded ? 'folderOpen' : 'folderClosed'} />,
        children: hasChildren ? node.children!.map((child) => buildNode(child)) : undefined,
        isExpanded: node.isExpanded,
        callback: () => handleToggleExpand(node.id),
      };
    };

    return topLevelFolders.map(buildNode);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedFolders(new Set());
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // If "All" is selected, pass null to indicate no restrictions
      const allowedFolders = selectAll ? null : Array.from(selectedFolders);
      await onSave(allowedFolders);
    } catch (err) {
      setError((err as Error).message || 'Failed to save folder selection');
      setIsSaving(false);
    }
  };

  // Helper to recursively filter tree items based on search query
  const filterTreeItems = (items: any[], query: string): any[] => {
    if (!query) return items;

    const lowerQuery = query.toLowerCase();
    return items
      .map((item) => {
        // Check if this item matches
        const folderName = folderTree.get(item.id)?.name || '';
        const matches = folderName.toLowerCase().includes(lowerQuery);

        // Recursively filter children
        const filteredChildren = item.children ? filterTreeItems(item.children, query) : undefined;

        // Include item if it matches or has matching children
        if (matches || (filteredChildren && filteredChildren.length > 0)) {
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const filteredTreeItems = searchQuery
    ? filterTreeItems(buildTreeViewItems(), searchQuery)
    : buildTreeViewItems();

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby="folderSelectionTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <img
              src={getConnectorIconPath('google_drive')}
              alt="Google Drive logo"
              width={32}
              height={32}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="folderSelectionTitle">Configure Folder Access</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>
            Choose which folders can be searched. Select &quot;All Folders&quot; to search
            everything.
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {error && (
          <>
            <EuiCallOut announceOnMount title="Error" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <EuiCheckbox
              id="select-all-folders"
              label="All Folders"
              checked={selectAll}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />

            <EuiSpacer size="m" />

            {!selectAll && (
              <>
                <EuiFieldSearch
                  placeholder="Search folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                />

                <EuiSpacer size="m" />

                {selectedFolders.size > 0 && (
                  <>
                    <EuiBadge color="primary">{selectedFolders.size} selected</EuiBadge>
                    <EuiSpacer size="s" />
                  </>
                )}

                {filteredTreeItems.length === 0 ? (
                  <EuiEmptyPrompt
                    title={<h3>No folders found</h3>}
                    body={<p>No folders match your search query.</p>}
                  />
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <EuiTreeView
                      items={filteredTreeItems}
                      display="default"
                      showExpansionArrows={true}
                      aria-label="Google Drive folder tree"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiButtonEmpty onClick={onClose} disabled={isSaving} size="m">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              onClick={handleSave}
              fill
              isLoading={isSaving}
              size="m"
              fullWidth
              disabled={!selectAll && selectedFolders.size === 0}
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
