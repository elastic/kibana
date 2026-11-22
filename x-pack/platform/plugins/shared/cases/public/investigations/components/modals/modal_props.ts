/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationRecord } from '../../../../common/investigations/types';

export type ModalName =
  | 'determination'
  | 'report'
  | 'history'
  | 'merge'
  | 'close'
  | 'reopen'
  | 'restrict'
  | 'changeType'
  | 'runWorkflow'
  | 'pause';

/** Extra input for the modals that act on a chosen status. */
export interface ModalOptions {
  /** The status the modal moves the investigation to (the `pause` and `close` modals). */
  statusKey?: string;
}

/** Opens a modal. Modals that do not need options ignore them. */
export type OpenModal = (name: ModalName, options?: ModalOptions) => void;

export interface InvestigationModalProps {
  record: InvestigationRecord;
  onClose: () => void;
  statusKey?: string;
}
