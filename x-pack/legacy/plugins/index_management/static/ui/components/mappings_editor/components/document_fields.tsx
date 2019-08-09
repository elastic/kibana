/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect } from 'react';
import { EuiTitle, EuiSpacer, EuiButton } from '@elastic/eui';

import { Tree, TreeItem } from './tree';
import { PropertyListItem, PropertyEditor, SavePropertyProvider } from './property';
import { usePropertiesState, usePropertiesDispatch } from './properties_contex';

export interface DocumentFieldsState {
  isEditing: boolean;
  properties: Record<string, any>;
}

interface Props {
  onUpdate: (state: DocumentFieldsState) => void;
}

export const DocumentFields = ({ onUpdate }: Props) => {
  const { properties, selectedPath, selectedObjectToAddProperty } = usePropertiesState();
  const dispatch = usePropertiesDispatch();

  const showCreateForm = selectedObjectToAddProperty === '';

  useEffect(() => {
    onUpdate({
      properties,
      isEditing: selectedPath !== null || selectedObjectToAddProperty !== null,
    });
  }, [properties, selectedPath, selectedObjectToAddProperty]);

  const renderCreateForm = (style = {}) => (
    <SavePropertyProvider>
      {saveProperty => (
        <PropertyEditor
          onSubmit={(newProperty: Record<string, any>) => {
            saveProperty({ newProperty, path: '', isEditMode: false, isCreateMode: true });
          }}
          onCancel={() => dispatch({ type: 'selectObjectToAddProperty', value: null })}
          parentObject={properties}
        />
      )}
    </SavePropertyProvider>
  );

  return (
    <Fragment>
      <EuiTitle size="s">
        <h4>Document fields</h4>
      </EuiTitle>
      <EuiSpacer size="m" />

      <Tree defaultIsOpen>
        {Object.entries(properties)
          // Make sure to display the fields in alphabetical order
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([name, property], i) => (
            <TreeItem key={name}>
              <PropertyListItem
                name={name}
                path={name}
                property={property as any}
                nestedDepth={1}
              />
            </TreeItem>
          ))}
      </Tree>
      <EuiSpacer size="s" />
      {showCreateForm ? (
        renderCreateForm()
      ) : (
        <EuiButton
          iconType="plusInCircle"
          size="s"
          onClick={() => dispatch!({ type: 'selectObjectToAddProperty', value: '' })}
          isDisabled={selectedPath !== null || selectedObjectToAddProperty !== null}
        >
          Add property
        </EuiButton>
      )}
    </Fragment>
  );
};
