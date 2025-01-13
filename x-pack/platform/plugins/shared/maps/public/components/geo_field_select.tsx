/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { type Props as SingleFieldSelectProps, SingleFieldSelect } from './single_field_select';

type Props = SingleFieldSelectProps & {
  geoFields: DataViewField[];
};

export function GeoFieldSelect(props: Props) {
  const { geoFields, ...rest } = props;
  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.source.geofieldLabel', {
        defaultMessage: 'Geospatial field',
      })}
    >
      <SingleFieldSelect
        placeholder={i18n.translate('xpack.maps.source.selectLabel', {
          defaultMessage: 'Select geo field',
        })}
        fields={props.geoFields}
        {...rest}
      />
    </EuiFormRow>
  );
}
