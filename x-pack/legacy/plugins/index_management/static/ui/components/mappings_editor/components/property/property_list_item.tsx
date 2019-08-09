/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';

import { PropertyView } from './property_view';
import { PropertyEditor } from './property_editor';
import { SavePropertyProvider } from './save_property_provider';
import { DeletePropertyProvider } from './delete_property_provider';
import { Tree, TreeItem } from '../tree';
import { usePropertiesState, usePropertiesDispatch } from '../properties_contex';
import { getNestedFieldMeta, getParentObject } from '../../helpers';
interface Props {
  name: string;
  path: string;
  property: Record<string, any>;
  nestedDepth: number;
}

export const PropertyListItem = ({ name, property, path, nestedDepth }: Props) => {
  const { selectedPath, selectedObjectToAddProperty, properties } = usePropertiesState();
  const dispatch = usePropertiesDispatch();

  const {
    hasChildProperties,
    nestedFieldPropName,
    allowChildProperty,
    childProperties,
  } = getNestedFieldMeta(property);

  const isEditMode = selectedPath === path;
  const isCreateMode = selectedObjectToAddProperty === path;
  const isPropertyEditorVisible = isEditMode || isCreateMode;
  const parentObject = getParentObject(path, properties);
  const [showChildren, setShowChildren] = useState<boolean>(isPropertyEditorVisible);

  const renderActionButtons = () => (
    <EuiFlexGroup gutterSize="xs">
      {allowChildProperty && (
        <EuiFlexItem>
          <EuiButtonIcon
            color="primary"
            onClick={() => dispatch({ type: 'selectObjectToAddProperty', value: path })}
            iconType="plusInCircle"
            aria-label="Add property"
            disabled={selectedPath !== null || selectedObjectToAddProperty !== null}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiButtonIcon
          color="primary"
          onClick={() => dispatch({ type: 'selectPath', value: path })}
          iconType="pencil"
          aria-label="Edit property"
          disabled={selectedPath !== null || selectedObjectToAddProperty !== null}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <DeletePropertyProvider>
          {deleteProperty => (
            <EuiButtonIcon
              color="danger"
              onClick={() => deleteProperty({ name, ...property }, path)}
              iconType="trash"
              aria-label="Delete property"
              disabled={selectedPath !== null || selectedObjectToAddProperty !== null}
            />
          )}
        </DeletePropertyProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderEditForm = (style = {}) => (
    <SavePropertyProvider>
      {saveProperty => (
        <PropertyEditor
          onSubmit={(newProperty: Record<string, any>) => {
            // Make sure the object is unfolded
            setShowChildren(true);
            saveProperty({ newProperty, oldProperty: property, path, isEditMode, isCreateMode });
          }}
          onCancel={() =>
            isCreateMode
              ? dispatch({ type: 'selectObjectToAddProperty', value: null })
              : dispatch({ type: 'selectPath', value: null })
          }
          defaultValue={isCreateMode ? undefined : { name, ...property }}
          parentObject={isCreateMode ? property[nestedFieldPropName!] : parentObject}
          style={{ ...style, marginLeft: `${nestedDepth * -24 + 1}px` }}
        />
      )}
    </SavePropertyProvider>
  );

  const renderPropertiesTree = () => (
    <Tree
      headerContent={<PropertyView name={name} property={property} />}
      rightHeaderContent={renderActionButtons()}
      isOpen={isPropertyEditorVisible ? true : showChildren}
      onToggle={() => setShowChildren(prev => !prev)}
    >
      <Fragment>
        {isPropertyEditorVisible && renderEditForm({ marginTop: 0, marginBottom: '12px' })}
        {Object.entries(childProperties)
          // Make sure to display the fields in alphabetical order
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([childName, childProperty], i) => (
            <TreeItem key={`${path}.${nestedFieldPropName}.${childName}`}>
              <PropertyListItem
                name={childName}
                path={`${path}.${nestedFieldPropName}.${childName}`}
                property={childProperty as any}
                nestedDepth={nestedDepth + 1}
              />
            </TreeItem>
          ))}
      </Fragment>
    </Tree>
  );

  const renderNoChildren = () => (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <PropertyView name={name} property={property} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{renderActionButtons()}</EuiFlexItem>
      </EuiFlexGroup>
      {isPropertyEditorVisible && renderEditForm()}
    </Fragment>
  );

  return allowChildProperty ? (
    <Fragment>
      {isPropertyEditorVisible && <div className="property-list-item__overlay"></div>}
      {hasChildProperties ? renderPropertiesTree() : renderNoChildren()}
    </Fragment>
  ) : (
    renderNoChildren()
  );
};
