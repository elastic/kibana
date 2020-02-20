/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSuperSelect, EuiTextColor, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const OPTION_ID_DELIMITER = '/';

function createOptionId({ indexPatternId, geoFieldName }) {
  // Namespace field with indexPatterId to avoid collisions between field names
  return `${indexPatternId}${OPTION_ID_DELIMITER}${geoFieldName}`;
}

function splitOptionId(optionId) {
  const split = optionId.split(OPTION_ID_DELIMITER);
  return {
    indexPatternId: split[0],
    geoFieldName: split[1],
  };
}

export function MultiIndexGeoFieldSelect({ selectedField, fields = [], onChange }) {
  function onFieldSelect(selectedOptionId) {
    const { indexPatternId, geoFieldName } = splitOptionId(selectedOptionId);

    const newSelectedField = fields.find(field => {
      return field.indexPatternId === indexPatternId && field.geoFieldName === geoFieldName;
    });
    onChange(newSelectedField);
  }

  const options = fields.map(({ indexPatternId, indexPatternTitle, geoFieldName }) => {
    return {
      inputDisplay: (
        <EuiText size="s" component="span">
          <EuiTextColor color="subdued">
            <small>{indexPatternTitle}</small>
          </EuiTextColor>
          <br />
          {geoFieldName}
        </EuiText>
      ),
      value: createOptionId({ indexPatternId, geoFieldName }),
    };
  });

  return (
    <EuiFormRow
      className="mapGeometryFilter__geoFieldSuperSelectWrapper"
      label={i18n.translate('xpack.maps.multiIndexFieldSelect.fieldLabel', {
        defaultMessage: 'Filtering field',
      })}
      display="rowCompressed"
    >
      <EuiSuperSelect
        className="mapGeometryFilter__geoFieldSuperSelect"
        options={options}
        valueOfSelected={selectedField ? createOptionId(selectedField) : ''}
        onChange={onFieldSelect}
        hasDividers={true}
        fullWidth={true}
        compressed={true}
        itemClassName="mapGeometryFilter__geoFieldItem"
      />
    </EuiFormRow>
  );
}
