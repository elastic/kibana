/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

/** What a provider added to the chat, reported with the shared "Add to chat" event. */
export interface AddToChatResult {
  attachmentTypes: readonly string[];
}

/**
 * Decides what the "Add to chat" panel action sends for the panels it handles, for example a
 * dashboard panel pointer. The action runs the first registered provider compatible with a panel.
 */
export interface AddToChatProvider {
  /** Unique id, reported as the pathway of the shared "Add to chat" event. */
  id: string;
  isCompatible: (embeddable: unknown) => boolean | Promise<boolean>;
  /** Emits when the panel may have become compatible or incompatible. */
  getCompatibilityChangesSubject?: (embeddable: unknown) => Observable<undefined> | undefined;
  /** Adds the panel to the chat; returns undefined when it added nothing. */
  execute: (embeddable: unknown) => Promise<AddToChatResult | undefined>;
}

export interface AddToChatProviderRegistry {
  register: (provider: AddToChatProvider) => void;
  getAll: () => readonly AddToChatProvider[];
}
