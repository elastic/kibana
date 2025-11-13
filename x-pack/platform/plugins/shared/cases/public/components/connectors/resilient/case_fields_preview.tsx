/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsPreviewProps } from '../types';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';

import * as i18n from './translations';
import type { ResilientFieldsType } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import { ConnectorCard } from '../card';
import { useGetFields } from './use_get_fields';
import type { ResilientFieldMetadata } from './types';
import { PreferenceFormattedDate } from '../../formatted_date';

const ResilientFieldsComponent: React.FunctionComponent<
  ConnectorFieldsPreviewProps<ResilientFieldsType>
> = ({ connector, fields }) => {
  const { incidentTypes = null, severityCode = null, additionalFields = null } = fields ?? {};
  const { http } = useKibana().services;

  const {
    isLoading: isLoadingIncidentTypesData,
    isFetching: isFetchingIncidentTypesData,
    data: allIncidentTypesData,
  } = useGetIncidentTypes({
    http,
    connector,
  });

  const {
    isLoading: isLoadingSeverityData,
    isFetching: isFetchingSeverityData,
    data: severityData,
  } = useGetSeverity({
    http,
    connector,
  });

  const {
    isLoading: isLoadingFields,
    isFetching: isFetchingFields,
    data: fieldsData,
  } = useGetFields({
    http,
    connector,
  });
  const fieldsMetadataRecord = useMemo(() => {
    return (fieldsData?.data ?? []).reduce((acc, field) => {
      acc[field.name] = field;
      return acc;
    }, {} as Record<string, ResilientFieldMetadata>);
  }, [fieldsData]);

  const isLoadingIncidentTypes = isLoadingIncidentTypesData || isFetchingIncidentTypesData;
  const isLoadingSeverity = isLoadingSeverityData || isFetchingSeverityData;
  const isLoadingFieldsData = isLoadingFields || isFetchingFields;
  const isLoading = isLoadingIncidentTypes || isLoadingSeverity || isLoadingFieldsData;

  const allIncidentTypes = allIncidentTypesData?.data;
  const severity = severityData?.data;

  const listItems = useMemo(() => {
    let additionalFieldsParsed: Record<string, string> = {};
    try {
      additionalFieldsParsed = additionalFields ? JSON.parse(additionalFields) : {};
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error parsing additional fields:', error, { additionalFields });
    }

    return [
      ...(incidentTypes != null && incidentTypes.length > 0
        ? [
            {
              title: i18n.INCIDENT_TYPES_LABEL,
              description: (allIncidentTypes ?? [])
                .filter((type) => incidentTypes.includes(type.id.toString()))
                .map((type) => type.name)
                .join(', '),
            },
          ]
        : []),
      ...(severityCode != null && severityCode.length > 0
        ? [
            {
              title: i18n.SEVERITY_LABEL,
              description:
                severity?.find((severityObj) => severityObj.id.toString() === severityCode)?.name ??
                '',
            },
          ]
        : []),
      ...(additionalFields != null && additionalFields.length > 0
        ? Object.keys(additionalFieldsParsed).map((key) => ({
            title: fieldsMetadataRecord[key]?.text ?? key,
            description: renderAddtionalFieldsDescription(
              fieldsMetadataRecord[key],
              additionalFieldsParsed[key]
            ),
          }))
        : []),
    ];
  }, [
    incidentTypes,
    severityCode,
    allIncidentTypes,
    severity,
    additionalFields,
    fieldsMetadataRecord,
  ]);

  return (
    <ConnectorCard
      connectorType={ConnectorTypes.resilient}
      isLoading={isLoading}
      listItems={listItems}
      title={connector.name}
    />
  );
};

function renderAddtionalFieldsDescription(
  fieldMetaData: ResilientFieldMetadata | undefined,
  fieldValue: string | number | boolean | string[] | number[] | null | undefined
) {
  if (!fieldMetaData) {
    return fieldValue;
  }
  switch (fieldMetaData.input_type) {
    case 'boolean':
      return typeof fieldValue === 'boolean' ? (fieldValue ? 'true' : 'false') : '';
    case 'number':
      return typeof fieldValue === 'number' ? fieldValue.toString() : '';
    case 'datepicker':
      return typeof fieldValue === 'number' ? (
        <PreferenceFormattedDate dateFormat="MMMM D, YYYY" value={new Date(fieldValue)} />
      ) : (
        fieldValue
      );
    case 'datetimepicker':
      return typeof fieldValue === 'number' ? (
        <PreferenceFormattedDate
          dateFormat="MMMM D, YYYY @ HH:mm:ss"
          value={new Date(fieldValue)}
        />
      ) : (
        fieldValue
      );
    case 'select': {
      const option =
        fieldValue &&
        fieldMetaData.values?.find((item) => item.value.toString() === fieldValue.toString());
      return option ? option.label : fieldValue;
    }
    case 'multiselect': {
      return Array.isArray(fieldValue) && fieldMetaData?.values
        ? (fieldValue as Array<string | number>)
            .map((val) => {
              const option = fieldMetaData.values?.find(
                (item) => item.value.toString() === val.toString()
              );
              return option ? option.label : val.toString();
            })
            .join(', ')
        : '';
    }

    case 'text':
    case 'textarea':
    default:
      return fieldValue ?? '';
  }
}

ResilientFieldsComponent.displayName = 'ResilientFields';
// eslint-disable-next-line import/no-default-export
export { ResilientFieldsComponent as default };
