/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useOptionalConversationSpineContext } from '../conversation_spine_context';

export const useIsCartRailOpen = (): boolean => {
  const spineContext = useOptionalConversationSpineContext();

  if (!spineContext) {
    return false;
  }

  if (spineContext.hasAttachments && spineContext.isSpineActive) {
    return true;
  }

  return spineContext.isAttachmentsEmptyOpen && !spineContext.hasAttachments;
};
