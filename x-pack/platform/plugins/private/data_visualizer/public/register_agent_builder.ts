/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { FILE_UPLOAD_ATTACHMENT_TYPE } from '@kbn/file-upload-common';
import { createFileUploadAttachmentDefinition } from '@kbn/file-upload';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';
import { getFileUploadDependencies } from './get_file_upload_dependencies';

/** Registers the file upload card with Agent Builder. */
export const registerAgentBuilderAttachments = (
  coreStart: CoreStart,
  plugins: DataVisualizerStartDependencies,
  agentBuilder: AgentBuilderPluginStart
): void => {
  agentBuilder.attachments.addAttachmentType(
    FILE_UPLOAD_ATTACHMENT_TYPE,
    createFileUploadAttachmentDefinition(coreStart, getFileUploadDependencies(coreStart, plugins))
  );
};
