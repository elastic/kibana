/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { get, isEmpty, uniq } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import countries from 'i18n-iso-countries';
import countryJson from 'i18n-iso-countries/langs/en.json';

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

const GeoFieldValues = pure<{
  contextId: string;
  displayFullCountryName: boolean;
  eventId: string;
  fieldName: string;
  hideTooltipContent: boolean;
  values?: string[] | null;
}>(({ contextId, displayFullCountryName, eventId, fieldName, hideTooltipContent, values }) =>
  values != null ? (
    <>
      {uniq(values).map(value => (
        <GeoFlexItem grow={false} key={`${contextId}-${eventId}-${fieldName}-${value}`}>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            {fieldName === SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME ||
            fieldName === DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME ? (
              <EuiFlexItem grow={false}>
                <CountryFlag countryCode={value} />
              </EuiFlexItem>
            ) : null}

            {(fieldName === SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME ||
              fieldName === DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME) &&
            displayFullCountryName ? (
              <EuiFlexItem grow={false}>
                <DefaultDraggable
                  data-test-subj={fieldName}
                  field={fieldName}
                  id={`${contextId}-${eventId}-${fieldName}-${value}`}
                  name={countries.getName(value, 'en')}
                  tooltipContent={hideTooltipContent ? null : fieldName}
                  value={value}
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <DefaultDraggable
                  data-test-subj={fieldName}
                  field={fieldName}
                  id={`${contextId}-${eventId}-${fieldName}-${value}`}
                  tooltipContent={hideTooltipContent ? null : fieldName}
                  value={value}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </GeoFlexItem>
      ))}
    </>
  ) : null
);

/**
 * Renders a row of draggable text containing geographic fields, such as:
 * - `source|destination.geo.continent_name`
 * - `source|destination.geo.country_name`
 * - `source|destination.geo.country_iso_code`
 * - `source|destination.geo.region_iso_code`
 * - `source|destination.geo.city_name`
 */
export class GeoFields extends React.Component<GeoFieldsProps> {
  componentDidMount(): void {
    if (isEmpty(countries.getNames('en'))) {
      countries.registerLocale(countryJson);
    }
  }

  public render() {
    const {
      contextId,
      displayFullCountryName = false,
      eventId,
      hideTooltipContent = false,
      type,
    } = this.props;

    const propNameToFieldName = getGeoFieldPropNameToFieldNameMap(type);
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        {uniq(propNameToFieldName).map(geo => (
          <GeoFieldValues
            contextId={contextId}
            displayFullCountryName={displayFullCountryName}
            eventId={eventId}
            fieldName={geo.fieldName}
            hideTooltipContent={hideTooltipContent}
            key={geo.fieldName}
            values={get(geo.prop, this.props)}
          />
        ))}
      </EuiFlexGroup>
    );
  }
}
