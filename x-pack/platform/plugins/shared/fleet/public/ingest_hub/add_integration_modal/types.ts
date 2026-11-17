/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Options a host passes when opening the Add integration experience.
 *
 * Deliberately free of React and of any import that reaches the Integrations app: this module is
 * part of Fleet's public contract, and anything reachable from it becomes reachable from every
 * bundle that depends on Fleet.
 */
export interface OpenAddIntegrationModalOptions {
  /** "Add data" in Streams, "Add integration" elsewhere. */
  title?: string;
  subtitle?: string;
  /** Where the experience opens; e.g. `/detail/nginx/overview` to deep-link a package. */
  initialPath?: string;
  /** Called after the modal has closed and unmounted, however it was dismissed. */
  onClose?: () => void;
}

/** Closes the modal and tears down its React root. Safe to call more than once. */
export type CloseAddIntegrationModal = () => void;
