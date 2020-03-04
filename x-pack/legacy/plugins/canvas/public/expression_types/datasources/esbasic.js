/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from '../../lib/arg_helpers';
import { ESFieldsSelect } from '../../components/es_fields_select';
import { ESIndexSelect } from '../../components/es_index_select';
import { templateFromReactComponent } from '../../lib/template_from_react_component';
import { ExpressionDataSourceStrings } from '../../../i18n';

const { ESBasic: strings } = ExpressionDataSourceStrings;

const EsbasicDatasource = ({ args, updateArgs, defaultIndex }) => {
  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.

  const getIndex = () => {
    return getSimpleArg('index', args)[0] || '';
  };

  const getFields = () => {
    const commas = getSimpleArg('fields', args)[0] || '';
    if (commas.length === 0) {
      return [];
    }
    return commas.split(',').map(str => str.trim());
  };

  const fields = getFields();

  const index = getIndex();

  if (!index && defaultIndex) {
    setArg('index', defaultIndex);
  }

  return (
    <div>
      <EuiCallOut size="s" title={strings.getWarningTitle()} iconType="alert" color="warning">
        <p>{strings.getWarning()}</p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={strings.getIndexTitle()}
        helpText={strings.getIndexLabel()}
        display="rowCompressed"
      >
        <ESIndexSelect value={index} onChange={index => setArg('index', index)} />
      </EuiFormRow>

      <EuiFormRow
        label={strings.getFieldsTitle()}
        helpText={fields.length <= 10 ? strings.getFieldsLabel() : strings.getFieldsWarningLabel()}
        display="rowCompressed"
      >
        <ESFieldsSelect
          index={index}
          onChange={fields => setArg('fields', fields.join(', '))}
          selected={fields}
        />
      </EuiFormRow>
    </div>
  );
};

EsbasicDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  defaultIndex: PropTypes.string,
};

export const esbasic = () => ({
  name: 'esbasic',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  image: 'logoElasticsearch',
  template: templateFromReactComponent(EsbasicDatasource),
});
