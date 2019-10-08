/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { useState as useMappingsState, useDispatch } from '../../../mappings_state';
import { NormalizedField } from '../../../types';

type DeleteFieldFunc = (property: NormalizedField) => void;

interface Props {
  children: (deleteProperty: DeleteFieldFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  field: NormalizedField | undefined;
}

export const DeleteFieldProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false, field: undefined });
  const dispatch = useDispatch();
  const {
    fields: { byId },
  } = useMappingsState();

  const closeModal = () => {
    setState({ isModalOpen: false, field: undefined });
  };

  const deleteField: DeleteFieldFunc = field => {
    const { hasChildFields } = field;

    if (hasChildFields) {
      setState({ isModalOpen: true, field });
    } else {
      dispatch({ type: 'field.remove', value: field.id });
    }
  };

  const confirmDelete = () => {
    dispatch({ type: 'field.remove', value: state.field!.id });
    closeModal();
  };

  const renderModal = () => {
    const field = state.field!;
    const childFields = field.childFields!.map(childId => byId[childId]);
    const title = `Remove property '${field.source.name}'?`;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={closeModal}
          onConfirm={confirmDelete}
          cancelButtonText="Cancel"
          buttonColor="danger"
          confirmButtonText="Remove"
        >
          <Fragment>
            <p>
              This will also delete the following child fields and the possible child fields under
              them.
            </p>
            <ul>
              {childFields
                .map(_field => _field.source.name)
                .sort()
                .map(name => (
                  <li key={name}>{name}</li>
                ))}
            </ul>
          </Fragment>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deleteField)}
      {state.isModalOpen && renderModal()}
    </Fragment>
  );
};
