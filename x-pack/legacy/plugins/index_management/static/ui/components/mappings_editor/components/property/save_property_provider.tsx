/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiTitle } from '@elastic/eui';

import { usePropertiesDispatch } from '../properties_contex';
import { getNestedFieldMeta } from '../../helpers';

type SavePropertyFunc = (args: {
  newProperty: Record<string, any>;
  oldProperty?: Record<string, any>;
  path: string;
  isEditMode: boolean;
  isCreateMode: boolean;
}) => void;

interface Props {
  children: (saveProperty: SavePropertyFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  path: string | null;
  newProperty: Record<string, any> | null;
  oldProperty: Record<string, any> | null;
}

export const SavePropertyProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({
    isModalOpen: false,
    path: null,
    newProperty: null,
    oldProperty: null,
  });
  const dispatch = usePropertiesDispatch();

  const closeModal = () => {
    setState({ isModalOpen: false, path: null, newProperty: null, oldProperty: null });
  };

  const saveProperty: SavePropertyFunc = ({
    newProperty,
    oldProperty,
    path,
    isCreateMode,
    isEditMode,
  }) => {
    const { name: updatedName, ...rest } = newProperty;

    const handleUpdateFieldName = (newName: string): string => {
      // The name has been updated, we need to
      // 1. Change the property path to the new path
      // 2. Replace the old property at the new path
      const pathToArray = path.split('.');
      pathToArray[pathToArray.length - 1] = newName;
      const newPath = pathToArray.join('.');

      dispatch({ type: 'updatePropertyPath', oldPath: path, newPath });
      return newPath;
    };

    const handleUpdateFieldType = (
      oldType: string,
      newType: string
    ): { requiresConfirmation: boolean } => {
      const { hasChildProperties } = getNestedFieldMeta(oldProperty!);

      if (!hasChildProperties) {
        // No child properties will be deleted, no confirmation needed.
        return { requiresConfirmation: false };
      }

      let requiresConfirmation = false;

      if (oldType === 'text' && newType !== 'keyword') {
        requiresConfirmation = true;
      } else if (oldType === 'keyword' && newType !== 'text') {
        requiresConfirmation = true;
      } else if (oldType === 'object' && newType !== 'nested') {
        requiresConfirmation = true;
      } else if (oldType === 'nested' && newType !== 'object') {
        requiresConfirmation = true;
      }

      return { requiresConfirmation };
    };

    let pathToSaveProperty = path;

    if (isEditMode) {
      if (updatedName !== name) {
        pathToSaveProperty = handleUpdateFieldName(updatedName);
      }
      if (rest.type !== oldProperty!.type) {
        // We need to check if, by changing the type, we need
        // to delete the possible child properties ("fields" or "properties")
        // and warn the user about it.
        const { requiresConfirmation } = handleUpdateFieldType(oldProperty!.type, rest.type);
        if (requiresConfirmation) {
          setState({ isModalOpen: true, newProperty, oldProperty: oldProperty!, path });
          return;
        }
      }
    } else if (isCreateMode) {
      if (oldProperty) {
        // If there is an "oldProperty" it means we want to add the property
        // in either its "properties" or "fields"
        // nestedFieldPropName is "properties" (for object and nested types)
        // or "fields" (for text and keyword types).
        const { nestedFieldPropName } = getNestedFieldMeta(oldProperty!);
        pathToSaveProperty = `${path}.${nestedFieldPropName}.${updatedName}`;
      } else {
        // If there are no "oldProperty" we add the property to the top level
        // "properties" object.
        pathToSaveProperty = updatedName;
      }
    }
    dispatch({ type: 'saveProperty', path: pathToSaveProperty, value: rest });
  };

  const confirmTypeUpdate = () => {
    delete state.newProperty!.fields;
    delete state.newProperty!.properties;
    dispatch({ type: 'saveProperty', path: state.path!, value: state.newProperty! });
    closeModal();
  };

  const renderModal = () => {
    const { newProperty, oldProperty } = state;
    const title = `Confirm change '${newProperty!.name}' type to "${newProperty!.type}".`;
    const { nestedFieldPropName } = getNestedFieldMeta(oldProperty!);
    const childrenCount = Object.keys(oldProperty![nestedFieldPropName!]).length;

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
            <p>
              By changing the type of this property you will also delete its child{' '}
              {childrenCount > 1 ? 'properties' : 'property'}, and all{' '}
              {childrenCount > 1 ? 'their' : 'its'} possible nested properties.
            </p>
            <EuiTitle size="s">
              <h4>Nested {childrenCount > 1 ? 'properties' : 'property'} that will be removed</h4>
            </EuiTitle>
            <ul>
              {Object.keys(oldProperty![nestedFieldPropName!])
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
      {children(saveProperty)}
      {state.isModalOpen && renderModal()}
    </Fragment>
  );
};
