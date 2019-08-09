/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiTitle } from '@elastic/eui';

import { usePropertiesDispatch } from '../properties_contex';
import { getNestedFieldMeta } from '../../helpers';

type DeletePropertyFunc = (property: Record<string, any>, path: string) => void;

interface Props {
  children: (deleteProperty: DeletePropertyFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  path: string | null;
  property: Record<string, any> | null;
}

export const DeletePropertyProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false, path: null, property: null });
  const dispatch = usePropertiesDispatch();

  const closeModal = () => {
    setState({ isModalOpen: false, path: null, property: null });
  };

  const deleteProperty: DeletePropertyFunc = (property, path) => {
    const { hasChildProperties } = getNestedFieldMeta(property);

    if (hasChildProperties) {
      setState({ isModalOpen: true, property, path });
    } else {
      dispatch({ type: 'deleteProperty', path });
    }
  };

  const confirmDelete = () => {
    dispatch({ type: 'deleteProperty', path: state.path! });
    closeModal();
  };

  const renderModal = () => {
    const { property } = state;
    const { nestedFieldPropName } = getNestedFieldMeta(property!);
    const title = `Remove property '${property!.name}'?`;
    const childrenCount = Object.keys(property![nestedFieldPropName!]).length;

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
              By deleting this property you will also delete its child{' '}
              {childrenCount > 1 ? 'properties' : 'property'}, and all{' '}
              {childrenCount > 1 ? 'their' : 'its'} possible nested properties.
            </p>
            <EuiTitle size="s">
              <h4>Child properties that will also be deleted</h4>
            </EuiTitle>
            <ul>
              {Object.keys(property![nestedFieldPropName!])
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
      {children(deleteProperty)}
      {state.isModalOpen && renderModal()}
    </Fragment>
  );
};
