/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { ProcessedConversation } from './prepare_conversation';

/**
 * Returns the saved connector instance id when exactly one active connector
 * attachment exists; otherwise `undefined`.
 */
export function getLoneConnectorIdFromProcessedConversation(
  processedConversation: ProcessedConversation
): string | undefined {
  const active = processedConversation.attachmentStateManager.getActive();
  const connectors = active.filter((a) => a.type === AttachmentType.connector);
  if (connectors.length !== 1) {
    return undefined;
  }
  const latest = getLatestVersion(connectors[0]);
  if (!latest) {
    return undefined;
  }
  const { connector_id: connectorId } = latest.data as ConnectorAttachmentData;
  return typeof connectorId === 'string' && connectorId.length > 0 ? connectorId : undefined;
}
