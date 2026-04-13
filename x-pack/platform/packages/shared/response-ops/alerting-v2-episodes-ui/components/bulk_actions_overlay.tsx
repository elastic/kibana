/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { BulkSnoozeModal } from './actions/bulk_snooze_modal';
import { BulkTagsModal } from './actions/bulk_tags_modal';

export interface BulkActionsOverlayProps {
  pendingBulkState: { action: 'snooze' | 'tag'; selectedDocIds: string[] } | null;
  onClose: () => void;
  onApplySnooze: (expiry: string) => void;
  onSaveTags: (tags: string[]) => void;
  expressions: ExpressionsStart;
}

export const BulkActionsOverlay = ({
  pendingBulkState,
  onClose,
  onApplySnooze,
  onSaveTags,
  expressions,
}: BulkActionsOverlayProps) => {
  if (!pendingBulkState) {
    return null;
  }

  if (pendingBulkState.action === 'snooze') {
    return (
      <BulkSnoozeModal
        onClose={onClose}
        onApplySnooze={(expiry) => {
          onApplySnooze(expiry);
          // Note: BulkSnoozeModal auto-closes (calls onClose internally after onApplySnooze)
        }}
      />
    );
  }

  return <BulkTagsModal onClose={onClose} onSave={onSaveTags} services={{ expressions }} />;
};
