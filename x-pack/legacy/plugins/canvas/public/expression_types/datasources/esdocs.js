/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSelect, EuiTextArea, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from '../../lib/arg_helpers';
import { ESFieldsSelect } from '../../components/es_fields_select';
import { ESFieldSelect } from '../../components/es_field_select';
import { ESIndexSelect } from '../../components/es_index_select';
import { templateFromReactComponent } from '../../lib/template_from_react_component';
import { ExpressionDataSourceStrings } from '../../../i18n';

const { ESDocs: strings } = ExpressionDataSourceStrings;

const EsdocsDatasource = ({ args, updateArgs, defaultIndex }) => {
  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  const getArgName = () => {
    if (getSimpleArg('_', args)[0]) {
      return '_';
    }
    if (getSimpleArg('q', args)[0]) {
      return 'q';
    }
    return 'query';
  };

  const getIndex = () => {
    return getSimpleArg('index', args)[0] || '';
  };

  const getQuery = () => {
    return getSimpleArg(getArgName(), args)[0] || '';
  };

  const getFields = () => {
    const commas = getSimpleArg('fields', args)[0] || '';
    if (commas.length === 0) {
      return [];
    }
    return commas.split(',').map(str => str.trim());
  };

  const getSortBy = () => {
    const commas = getSimpleArg('sort', args)[0] || ', DESC';
    return commas.split(',').map(str => str.trim());
  };

  const fields = getFields();
  const [sortField, sortOrder] = getSortBy();

  const index = getIndex();

  if (!index && defaultIndex) {
    setArg('index', defaultIndex);
  }

  const sortOptions = [
    { value: 'asc', text: strings.getAscendingOption() },
    { value: 'desc', text: strings.getDescendingOption() },
  ];

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
        label={strings.getQueryTitle()}
        helpText={strings.getQueryLabel()}
        display="rowCompressed"
      >
        <EuiTextArea
          value={getQuery()}
          onChange={e => setArg(getArgName(), e.target.value)}
          compressed
        />
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

      <EuiFormRow
        label={strings.getSortFieldTitle()}
        helpText={strings.getSortFieldLabel()}
        display="columnCompressed"
      >
        <ESFieldSelect
          index={index}
          value={sortField}
          onChange={field => setArg('sort', [field, sortOrder].join(', '))}
        />
      </EuiFormRow>

      <EuiFormRow
        label={strings.getSortOrderTitle()}
        helpText={strings.getSortOrderLabel()}
        display="columnCompressed"
      >
        <EuiSelect
          value={sortOrder.toLowerCase()}
          onChange={e => setArg('sort', [sortField, e.target.value].join(', '))}
          options={sortOptions}
          compressed
        />
      </EuiFormRow>
    </div>
  );
};

EsdocsDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  defaultIndex: PropTypes.string,
};

export const esdocs = () => ({
  name: 'esdocs',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  image: 'logoElasticsearch',
  template: templateFromReactComponent(EsdocsDatasource),
});
