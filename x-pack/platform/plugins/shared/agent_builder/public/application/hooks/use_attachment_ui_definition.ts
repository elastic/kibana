/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useAttachmentUiDefinition = (type?: string) => {
  const { attachmentsService } = useAgentBuilderServices();
  const [uiDefinition, setUiDefinition] = useState<AttachmentUIDefinition | undefined>();
  useEffect(() => {
    if (!type) {
      setUiDefinition(undefined);
      return;
    }

    let canceled = false;
    attachmentsService.getAttachmentUiDefinition(type).then((definition) => {
      if (!canceled) {
        setUiDefinition(definition);
      }
    });
    return () => {
      canceled = true;
    };
  }, [attachmentsService, type]);

  return uiDefinition;
};
