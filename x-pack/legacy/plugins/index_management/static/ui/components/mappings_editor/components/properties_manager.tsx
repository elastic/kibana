/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiSpacer, EuiButton } from '@elastic/eui';

import {
  UseArray,
  Form,
} from '../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import { PropertyEditor } from './property_editor';

interface Props {
  form: Form;
  path?: string;
}

export const PropertiesManager = ({ form, path = 'properties' }: Props) => {
  return (
    <Fragment>
      <UseArray path={path} form={form}>
        {({ rows, addRow, removeRow }) => (
          <ul className="tree">
            {rows.map(({ id, rowPath, isNew }) => (
              <li key={id}>
                <PropertyEditor
                  fieldPathPrefix={`${rowPath}.`}
                  form={form}
                  onRemove={() => removeRow(id)}
                />
              </li>
            ))}
            <EuiSpacer size="s" />
            <EuiButton color="primary" onClick={addRow}>
              Add property
            </EuiButton>
          </ul>
        )}
      </UseArray>
      <EuiSpacer size="l" />
    </Fragment>
  );
};
