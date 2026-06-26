/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';

export interface AttachWithFlightOptions {
  sourceElement?: HTMLElement | null;
  sourceRect?: DOMRect;
  iconType?: IconType;
}

export interface AgentFirstAttachmentCoordinator {
  registerApplicationAttachButton: (element: HTMLElement | null) => void;
  registerAgentCartButton: (element: HTMLElement | null) => void;
  attachWithFlight: (attachment: AttachmentInput, options?: AttachWithFlightOptions) => Promise<void>;
}
