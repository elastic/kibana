/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  SavedObjectSaveModal,
  OnSaveProps,
} from 'ui/saved_objects/components/saved_object_save_modal';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface OnSaveGraphProps extends OnSaveProps {
  newDescription: string;
}

export function GraphSaveModal({
  onSave,
  onClose,
  title,
  description,
  showCopyOnSave,
}: {
  onSave: (props: OnSaveGraphProps) => void;
  onClose: () => void;
  title: string;
  description: string;
  showCopyOnSave: boolean;
}) {
  const [newDescription, setDescription] = useState(description);
  return (
    <SavedObjectSaveModal
      onSave={props => {
        onSave({ ...props, newDescription });
      }}
      onClose={onClose}
      title={title}
      showCopyOnSave={showCopyOnSave}
      objectType="graph-workspace"
      options={
        <EuiFormRow
          label={i18n.translate('xpack.graph.saveModal.descriptionFormRowLabel', {
            defaultMessage: 'Description',
          })}
        >
          <EuiTextArea
            data-test-subj="dashboardDescription"
            value={newDescription}
            onChange={e => {
              setDescription(e.target.value);
            }}
          />
        </EuiFormRow>
      }
    />
  );
}
