/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { useState as useMappingsState, useDispatch } from '../../../../mappings_state';
import { shouldDeleteChildFieldsAfterTypeChange, buildFieldTreeFromIds } from '../../../../lib';
import { NormalizedField, DataType } from '../../../../types';
import { Tree } from '../../../tree';

export type UpdateFieldFunc = (field: NormalizedField) => void;

interface Props {
  children: (saveProperty: UpdateFieldFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  field?: NormalizedField;
}

export const UpdateFieldProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({
    isModalOpen: false,
  });
  const dispatch = useDispatch();

  const {
    fields: { byId },
  } = useMappingsState();

  const closeModal = () => {
    setState({ isModalOpen: false });
  };

  const updateField: UpdateFieldFunc = field => {
    const previousField = byId[field.id];

    const handleTypeChange = (
      oldType: DataType,
      newType: DataType
    ): { requiresConfirmation: boolean } => {
      const { hasChildFields, hasMultiFields, canHaveChildFields, canHaveMultiFields } = field;

      if ((!hasChildFields && canHaveChildFields) || (!hasMultiFields && canHaveMultiFields)) {
        // No child or multi-fields will be deleted, no confirmation needed.
        return { requiresConfirmation: false };
      }

      const requiresConfirmation = shouldDeleteChildFieldsAfterTypeChange(oldType, newType);

      return { requiresConfirmation };
    };

    if (field.source.type !== previousField.source.type) {
      // We need to check if, by changing the type, we need
      // to delete the possible child properties ("fields" or "properties")
      // and warn the user about it.
      const { requiresConfirmation } = handleTypeChange(
        previousField.source.type,
        field.source.type
      );

      if (requiresConfirmation) {
        setState({ isModalOpen: true, field });
        return;
      }
    }

    dispatch({ type: 'field.edit', value: field.source });
  };

  const confirmTypeUpdate = () => {
    dispatch({ type: 'field.edit', value: state.field!.source });
    closeModal();
  };

  const renderModal = () => {
    const field = state.field!;
    const title = `Confirm change '${field.source.name}' type to "${field.source.type}".`;

    const fieldsTree = buildFieldTreeFromIds(
      field.childFields!,
      byId,
      (_field: NormalizedField) => _field.source.name
    );

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={closeModal}
          onConfirm={confirmTypeUpdate}
          cancelButtonText="Cancel"
          buttonColor="danger"
          confirmButtonText="Confirm type change"
        >
          <Fragment>
            <p>This will delete the following fields.</p>
            <Tree tree={fieldsTree} />
          </Fragment>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(updateField)}
      {state.isModalOpen && renderModal()}
    </Fragment>
  );
};
