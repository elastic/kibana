/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { get, uniq } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { DefaultDraggable } from '../draggables';

import { CountryFlag } from './country_flag';
import { GeoFieldsProps, SourceDestinationType } from './types';

export const SOURCE_GEO_CONTINENT_NAME_FIELD_NAME = 'source.geo.continent_name';
export const SOURCE_GEO_COUNTRY_NAME_FIELD_NAME = 'source.geo.country_name';
export const SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME = 'source.geo.country_iso_code';
export const SOURCE_GEO_REGION_NAME_FIELD_NAME = 'source.geo.region_name';
export const SOURCE_GEO_CITY_NAME_FIELD_NAME = 'source.geo.city_name';

export const DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME = 'destination.geo.continent_name';
export const DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME = 'destination.geo.country_name';
export const DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME = 'destination.geo.country_iso_code';
export const DESTINATION_GEO_REGION_NAME_FIELD_NAME = 'destination.geo.region_name';
export const DESTINATION_GEO_CITY_NAME_FIELD_NAME = 'destination.geo.city_name';

interface PropNameToFieldName {
  prop: string;
  fieldName: string;
}

const geoPropNameToFieldNameSuffix: PropNameToFieldName[] = [
  {
    prop: 'GeoContinentName',
    fieldName: 'geo.continent_name',
  },
  {
    prop: 'GeoCountryName',
    fieldName: 'geo.country_name',
  },
  {
    prop: 'GeoCountryIsoCode',
    fieldName: 'geo.country_iso_code',
  },
  {
    prop: 'GeoRegionName',
    fieldName: 'geo.region_name',
  },
  {
    prop: 'GeoCityName',
    fieldName: 'geo.city_name',
  },
];

export const getGeoFieldPropNameToFieldNameMap = (
  type: SourceDestinationType
): PropNameToFieldName[] =>
  geoPropNameToFieldNameSuffix.map(({ prop, fieldName }) => ({
    prop: `${type}${prop}`,
    fieldName: `${type}.${fieldName}`,
  }));

const GeoFlexItem = styled(EuiFlexItem)`
  margin-right: 5px;
`;

GeoFlexItem.displayName = 'GeoFlexItem';

const GeoFieldValues = React.memo<{
  contextId: string;
  eventId: string;
  fieldName: string;
  values?: string[] | null;
}>(({ contextId, eventId, fieldName, values }) =>
  values != null ? (
    <>
      {uniq(values).map(value => (
        <GeoFlexItem key={`${contextId}-${eventId}-${fieldName}-${value}`} grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            {fieldName === SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME ||
            fieldName === DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME ? (
              <EuiFlexItem grow={false}>
                <CountryFlag countryCode={value} />
              </EuiFlexItem>
            ) : null}

            <EuiFlexItem grow={false}>
              <DefaultDraggable
                data-test-subj={fieldName}
                field={fieldName}
                id={`geo-field-values-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
                tooltipContent={fieldName}
                value={value}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </GeoFlexItem>
      ))}
    </>
  ) : null
);

GeoFieldValues.displayName = 'GeoFieldValues';

/**
 * Renders a row of draggable text containing geographic fields, such as:
 * - `source|destination.geo.continent_name`
 * - `source|destination.geo.country_name`
 * - `source|destination.geo.country_iso_code`
 * - `source|destination.geo.region_iso_code`
 * - `source|destination.geo.city_name`
 */
export const GeoFields = React.memo<GeoFieldsProps>(props => {
  const { contextId, eventId, type } = props;

  const propNameToFieldName = getGeoFieldPropNameToFieldNameMap(type);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {uniq(propNameToFieldName).map(geo => (
        <GeoFieldValues
          key={geo.fieldName}
          contextId={contextId}
          eventId={eventId}
          fieldName={geo.fieldName}
          values={get(geo.prop, props)}
        />
      ))}
    </EuiFlexGroup>
  );
});

GeoFields.displayName = 'GeoFields';
