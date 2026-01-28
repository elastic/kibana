/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filesystemTools } from '@kbn/agent-builder-common/tools';
import type { IFileSystemStore } from '@kbn/agent-builder-server/runner/filesystem';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filesystem';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { buildFolderTree } from './utils/folder_tree';

const tools = {
  read: sanitizeToolId(filesystemTools.read),
  ls: sanitizeToolId(filesystemTools.ls),
  glob: sanitizeToolId(filesystemTools.glob),
  grep: sanitizeToolId(filesystemTools.grep),
};

export const getFileSystemInstructions = async ({
  filesystem,
}: {
  filesystem: IFileSystemStore;
}): Promise<string> => {
  const treeRepresentation = await buildFolderTree(filesystem, { maxFilesPerFolder: 3 });

  return cleanPrompt(`
  ## Filesystem

  You have access to a virtual filesystem containing files representing assets that you can use to perform your tasks

  ### Filesystem tools

  You have access to the following tools to access and interact with the filesystem:
  - ${tools.read}: access the content of a file
  - ${tools.ls}: list the content of a directory
  - ${tools.glob}: find files matching a glob pattern
  - ${tools.grep}: search for a text pattern in files

  Please refer to each tool's description and schema for more information on how to use it.

  ### Types of files

  The filesystem is used to store different types of files. Each of them

  #### **${FileEntryType.toolResult}**

  Those are created by tools during their execution

  They are all stored under the "/tool_calls" folder, and follow the following path convention: "/tool_calls/{tool_id}/{tool_call_id}/{tool_result_id}.json"

  ### Folder tree representation

  """
  ${treeRepresentation}
  """

  `);
};
