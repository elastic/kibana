/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';
import { FileTree, FileTreeItemType, sortFileTree } from '../../model';
import {
  fetchRepoTree,
  fetchRepoTreeFailed,
  fetchRepoTreeSuccess,
  RepoTreePayload,
  fetchRootRepoTreeSuccess,
  fetchRootRepoTreeFailed,
  dirNotFound,
  FetchRepoTreePayload,
} from '../actions';
import { routePathChange, repoChange, revisionChange } from '../actions/route';

function mergeNode(a: FileTree, b: FileTree): FileTree {
  const childrenMap: { [name: string]: FileTree } = {};
  if (a.children) {
    a.children.forEach(child => {
      childrenMap[child.name] = child;
    });
  }
  if (b.children) {
    b.children.forEach(childB => {
      const childA = childrenMap[childB.name];
      if (childA) {
        childrenMap[childB.name] = mergeNode(childA, childB);
      } else {
        childrenMap[childB.name] = childB;
      }
    });
  }
  return {
    ...a,
    ...b,
    children: Object.values(childrenMap).sort(sortFileTree),
  };
}

export function getPathOfTree(tree: FileTree, paths: string[]) {
  let child: FileTree | undefined = tree;
  for (const p of paths) {
    if (child && child.children) {
      child = child.children.find(c => c.name === p);
    } else {
      return null;
    }
  }
  return child;
}

export interface FileTreeState {
  tree: FileTree;
  fileTreeLoadingPaths: string[];
  // store not found directory as an array to calculate `notFound` flag by finding whether path is in this array
  notFoundDirs: string[];
  revision: string;
}

const initialState: FileTreeState = {
  tree: {
    name: '',
    path: '',
    type: FileTreeItemType.Directory,
  },
  fileTreeLoadingPaths: [''],
  notFoundDirs: [],
  revision: '',
};

const clearState = (state: FileTreeState) =>
  produce<FileTreeState>(state, draft => {
    draft.tree = initialState.tree;
    draft.fileTreeLoadingPaths = initialState.fileTreeLoadingPaths;
    draft.notFoundDirs = initialState.notFoundDirs;
    draft.revision = initialState.revision;
  });

type FileTreePayload = FetchRepoTreePayload & RepoTreePayload & FileTree & string;

export const fileTree = handleActions<FileTreeState, FileTreePayload>(
  {
    [String(fetchRepoTree)]: (state, action: Action<FetchRepoTreePayload>) =>
      produce(state, draft => {
        draft.fileTreeLoadingPaths.push(action.payload!.path);
      }),
    [String(fetchRepoTreeSuccess)]: (state, action: Action<RepoTreePayload>) =>
      produce<FileTreeState>(state, draft => {
        draft.revision = action.payload!.revision;
        draft.notFoundDirs = draft.notFoundDirs.filter(dir => dir !== action.payload!.path);
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(
          p => p !== action.payload!.path && p !== ''
        );
        const { tree, path, withParents } = action.payload!;
        let sortedTree: FileTree | undefined = tree;
        while (sortedTree && sortedTree.children && sortedTree.children.length > 0) {
          sortedTree.children = sortedTree.children.sort(sortFileTree);
          // each time the tree should only have one child that has children
          sortedTree = sortedTree.children.find(
            child => child.children && child.children.length > 0
          );
        }
        if (withParents || path === '/' || path === '') {
          draft.tree = mergeNode(draft.tree, tree);
        } else {
          const parentsPath = path.split('/');
          const lastPath = parentsPath.pop();
          const parent = getPathOfTree(draft.tree, parentsPath);
          if (parent) {
            parent.children = parent.children || [];
            const idx = parent.children.findIndex(c => c.name === lastPath);
            if (idx >= 0) {
              parent.children[idx] = tree;
            } else {
              parent.children.push(tree);
            }
          }
        }
      }),
    [String(fetchRootRepoTreeSuccess)]: (
      state,
      action: Action<{ revision: string; tree: FileTree }>
    ) =>
      produce<FileTreeState>(state, draft => {
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(p => p !== '/' && p !== '');
        draft.tree = mergeNode(draft.tree, action.payload!.tree);
        draft.revision = action.payload!.revision;
      }),
    [String(fetchRootRepoTreeFailed)]: state =>
      produce<FileTreeState>(state, draft => {
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(p => p !== '/' && p !== '');
      }),
    [String(dirNotFound)]: (state, action: Action<string>) =>
      produce<FileTreeState>(state, draft => {
        draft.notFoundDirs.push(action.payload!);
      }),
    [String(fetchRepoTreeFailed)]: (state, action: Action<FileTree>) =>
      produce(state, draft => {
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(
          p => p !== action.payload!.path && p !== ''
        );
      }),
    [String(routePathChange)]: clearState,
    [String(repoChange)]: clearState,
    [String(revisionChange)]: clearState,
  },
  initialState
);
