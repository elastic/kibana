/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButton, EuiAccordion, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import {
  UseArray,
  Form,
  ArrayItem,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import { PropertyEditor } from './property_editor';

interface Props {
  form: Form;
  parentType?: string;
  path?: string;
  fieldName?: string;
}

export const PropertiesManager = ({ form, parentType = 'root', path, fieldName = '' }: Props) => {
  const getArrayPath = () => {
    if (parentType === 'root') {
      return 'properties';
    }

    return parentType === 'text' || parentType === 'keyword'
      ? `${path}fields`
      : `${path}properties`;
  };

  const getAccordionButtonContent = () => {
    return parentType === 'text' || parentType === 'keyword'
      ? `${fieldName} child fields`
      : `${fieldName} properties`;
  };

  const renderPropertiesTree = ({
    items,
    addItem,
    removeItem,
  }: {
    items: ArrayItem[];
    addItem: () => void;
    removeItem: (id: number) => void;
  }) => (
    <Fragment>
      {items.length > 0 && (
        <Fragment>
          <ul className="tree">
            {items.map(({ id, path: itemPath, isNew }) => {
              return (
                <li key={id}>
                  <PropertyEditor
                    fieldPathPrefix={`${itemPath}.`}
                    form={form}
                    onRemove={() => removeItem(id)}
                    isEditMode={!isNew}
                  />
                </li>
              );
            })}
          </ul>
          <EuiSpacer size="l" />
        </Fragment>
      )}

      <EuiButton color="primary" onClick={addItem}>
        {parentType === 'text' || parentType === 'keyword' ? 'Add child field' : 'Add property'}
      </EuiButton>
    </Fragment>
  );

  return (
    <UseArray
      path={getArrayPath()}
      form={form}
      initialNumberOfItems={parentType === 'text' || parentType === 'keyword' ? 0 : 1}
    >
      {({ items, addItem, removeItem }) => {
        if (parentType === 'root' || items.length === 0) {
          // At the root level or if there aren't any property
          // we don't add the accordion
          return renderPropertiesTree({ items, addItem, removeItem });
        }
        return (
          <EuiAccordion
            id={uuid()}
            buttonContent={getAccordionButtonContent()}
            paddingSize="s"
            initialIsOpen={true}
          >
            {renderPropertiesTree({ items, addItem, removeItem })}
          </EuiAccordion>
        );
      }}
    </UseArray>
  );
};
