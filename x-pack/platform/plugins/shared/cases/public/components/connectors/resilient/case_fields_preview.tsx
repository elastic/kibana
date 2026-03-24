/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsPreviewProps } from '../types';

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
    isLoading: isLoadingFields,
    isFetching: isFetchingFields,
    data: fieldsData,
  } = useGetFields({
    http,
    connector,
  });

  const allIncidentTypes = useMemo(() => {
    const incidentTypesField = fieldsData?.data?.fieldsObj.incident_type_ids;
    if (incidentTypesField == null || !Array.isArray(incidentTypesField.values)) {
      return [];
    } else {
      return incidentTypesField.values;
    }
  }, [fieldsData]);

  const severity = useMemo(() => {
    const severityField = fieldsData?.data?.fieldsObj.severity_code;
    if (severityField == null || !Array.isArray(severityField.values)) {
      return [];
    } else {
      return severityField.values;
    }
  }, [fieldsData]);

  const isLoading = isLoadingFields || isFetchingFields;

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
                .filter((type) => incidentTypes.includes(type.value.toString()))
                .map((type) => type.label)
                .join(', '),
            },
          ]
        : []),
      ...(severityCode != null && severityCode.length > 0
        ? [
            {
              title: i18n.SEVERITY_LABEL,
              description:
                severity?.find((severityObj) => severityObj.value.toString() === severityCode)
                  ?.label ?? '',
            },
          ]
        : []),
      ...(additionalFields != null && additionalFields.length > 0
        ? Object.keys(additionalFieldsParsed).map((key) => ({
            title: fieldsData?.data?.fieldsObj[key]?.text ?? key,
            description: renderAddtionalFieldsDescription(
              fieldsData?.data?.fieldsObj[key],
              additionalFieldsParsed[key]
            ),
          }))
        : []),
    ];
  }, [incidentTypes, severityCode, allIncidentTypes, severity, additionalFields, fieldsData]);

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
