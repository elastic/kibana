/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type {
  UseApplicationAttachmentStateOptions,
  UseApplicationAttachmentStateResult,
} from '@kbn/agent-builder-browser';
import { attachWithFlightFromBridge } from './attachment_coordinator/coordinator_bridge';

export const useApplicationAttachmentState = ({
  getAttachment,
  linkDescriptor,
  iconType,
}: UseApplicationAttachmentStateOptions): UseApplicationAttachmentStateResult => {
  const attachment = getAttachment();
  const canAttach = attachment !== null;

  // Link evaluation is implemented in Checkpoint 4.
  const isLinked = false;

  const attach = useCallback(
    async (sourceElement: HTMLElement | null) => {
      if (isLinked) {
        return;
      }

      const nextAttachment = getAttachment();

      if (!nextAttachment) {
        return;
      }

      await attachWithFlightFromBridge(nextAttachment, {
        sourceElement,
        iconType,
      });
    },
    [getAttachment, iconType, isLinked]
  );

  return useMemo(
    () => ({
      canAttach,
      isLinked,
      attach,
    }),
    [attach, canAttach, isLinked]
  );
};
