/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';

export function GraphSaveModal({
  onSave,
  onClose,
  title,
  showCopyOnSave,
}: {
  onSave: () => any;
  onClose: () => void;
  title: string;
  showCopyOnSave: boolean;
}) {
  return (
    <SavedObjectSaveModal
      onSave={onSave}
      onClose={onClose}
      title={title}
      showCopyOnSave={showCopyOnSave}
      objectType="graph-workspace"
      options={null}
    />
  );
}
