/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filestoreTools } from '@kbn/agent-builder-common/tools';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { buildFolderTree } from './utils/folder_tree';

const tools = {
  read: sanitizeToolId(filestoreTools.read),
  ls: sanitizeToolId(filestoreTools.ls),
  glob: sanitizeToolId(filestoreTools.glob),
  grep: sanitizeToolId(filestoreTools.grep),
};

export const getFileSystemInstructions = async ({
  filesystem,
}: {
  filesystem: IFileStore;
}): Promise<string> => {
  const treeRepresentation = await buildFolderTree(filesystem, { maxFilesPerFolder: 3 });

  return cleanPrompt(`
  ## FILESTORE

  You have access to a file store, exposing a virtual filesystem containing files representing assets that you can use to perform your tasks.

  ### Tools

  You have access to the following tools to access and interact with the file store:
  - ${tools.read}: access the content of a file
  - ${tools.ls}: list the content of a directory
  - ${tools.glob}: find files matching a glob pattern
  - ${tools.grep}: search for a text pattern in files

  Please refer to each tool's description and schema for more information on how to use it.

  ### Types of files

  The filestore is used to store different types of files. Each of them represents a different concept in the system.

  #### ${FileEntryType.toolResult}

  Those are the results from all prior tool calls you performed during the current conversation, exposed
  so that you can access them later when required.

  - They are all stored under the "/tool_calls" folder
  - They follow this path convention: "/tool_calls/{tool_id}/{tool_call_id}/{tool_result_id}.json"

  ### Filesystem representation

  Here is a representation of what the filesystem currently contains:

  """
  ${treeRepresentation}
  """

  `);
};
