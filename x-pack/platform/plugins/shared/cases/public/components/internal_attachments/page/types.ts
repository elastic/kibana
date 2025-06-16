/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PersistableStateAttachmentState } from '../../../../common/types/domain';

export interface PageAttachmentPersistedState extends PersistableStateAttachmentState {
  type: string;
  label: string;
  icon: string;
  url: {
    pathAndQuery: string;
    label: string;
  };
  snapshot: {
    imgData: string;
  } | null;
}
