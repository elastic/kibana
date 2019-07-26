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
  const renderPropertiesTree = ({ rows, addRow, removeRow }) => (
    <ul className="tree" style={depthLevel === '0' ? { marginLeft: 0 } : {}}>
      {rows.map(({ id, rowPath, isNew }) => {
        return (
          <li key={id}>
            <PropertyEditor
              fieldPathPrefix={`${rowPath}.`}
              form={form}
              onRemove={() => removeRow(id)}
              isEditMode={!isNew}
            />
          </li>
        );
      })}
      <EuiButton color="primary" onClick={addRow}>
        Add property
      </EuiButton>
    </ul>
  );

  return (
    <Fragment>
      <UseArray path={path} form={form}>
        {({ rows, addRow, removeRow }) => {
          if (depthLevel === '0') {
            return renderPropertiesTree({ rows, addRow, removeRow });
          }
          return (
            <EuiAccordion
              id={uuid()}
              buttonContent={`${fieldName} properties`}
              paddingSize="l"
              initialIsOpen={true}
            >
              {renderPropertiesTree({ rows, addRow, removeRow })}
            </EuiAccordion>
          );
        }}
      </UseArray>
      <EuiSpacer size="l" />
    </Fragment>
  );
};
