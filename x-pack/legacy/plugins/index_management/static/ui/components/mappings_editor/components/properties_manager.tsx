/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiSpacer, EuiButton, EuiAccordion } from '@elastic/eui';
import uuid from 'uuid';

import {
  UseArray,
  Form,
  ArrayItem,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import { PropertyEditor } from './property_editor';

interface Props {
  form: Form;
  depthLevel?: string;
  path?: string;
  fieldName?: string;
}

export const PropertiesManager = ({
  form,
  depthLevel,
  path = 'properties',
  fieldName = '',
}: Props) => {
  const renderPropertiesTree = ({
    items,
    addItem,
    removeItem,
  }: {
    items: ArrayItem[];
    addItem: () => void;
    removeItem: (id: number) => void;
  }) => (
    <ul className="tree" style={depthLevel === '0' ? { marginLeft: 0 } : {}}>
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
      <EuiButton color="primary" onClick={addItem}>
        Add property
      </EuiButton>
    </ul>
  );

  return (
    <Fragment>
      <UseArray path={path} form={form}>
        {({ items, addItem, removeItem }) => {
          if (depthLevel === '0') {
            return renderPropertiesTree({ items, addItem, removeItem });
          }
          return (
            <EuiAccordion
              id={uuid()}
              buttonContent={`${fieldName} properties`}
              paddingSize="l"
              initialIsOpen={true}
            >
              {renderPropertiesTree({ items, addItem, removeItem })}
            </EuiAccordion>
          );
        }}
      </UseArray>
      <EuiSpacer size="l" />
    </Fragment>
  );
};
