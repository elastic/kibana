/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiPanel, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { Query } from '@kbn/es-query';
import type { GeoContainmentAlertParams } from '../types';
import { DataViewSelect } from './data_view_select';
import { SingleFieldSelect } from './single_field_select';
import { QueryInput } from './query_input';

export const ENTITY_GEO_FIELD_TYPES = ['geo_point', 'geo_shape'];

function getDateFields(fields: DataViewField[]) {
  return fields.filter((field: DataViewField) => field.type === 'date');
}

function getEntityFields(fields: DataViewField[]) {
  return fields.filter(
    (field: DataViewField) =>
      field.aggregatable &&
      ['string', 'number', 'ip'].includes(field.type) &&
      !field.name.startsWith('_')
  );
}

function getGeoFields(fields: DataViewField[]) {
  return fields.filter((field: DataViewField) => ENTITY_GEO_FIELD_TYPES.includes(field.type));
}

interface Props {
  data: DataPublicPluginStart;
  getValidationError: (key: string) => string | null;
  ruleParams: GeoContainmentAlertParams;
  setDataViewId: (id: string) => void;
  setDataViewTitle: (title: string) => void;
  setDateField: (fieldName: string) => void;
  setEntityField: (fieldName: string) => void;
  setGeoField: (fieldName: string) => void;
  setQuery: (query: Query) => void;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export const EntityForm = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [dataView, setDataView] = useState<undefined | DataView>();
  const [dataViewNotFound, setDataViewNotFound] = useState(false);
  const [dateFields, setDateFields] = useState<DataViewField[]>([]);
  const [entityFields, setEntityFields] = useState<DataViewField[]>([]);
  const [geoFields, setGeoFields] = useState<DataViewField[]>([]);

  useEffect(() => {
    if (!props.ruleParams.indexId || props.ruleParams.indexId === dataView?.id) {
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setDataViewNotFound(false);
    props.data.indexPatterns
      .get(props.ruleParams.indexId)
      .then((nextDataView) => {
        if (!ignore) {
          setDataView(nextDataView);
          setDateFields(getDateFields(nextDataView.fields));
          setEntityFields(getEntityFields(nextDataView.fields));
          setGeoFields(getGeoFields(nextDataView.fields));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setDataViewNotFound(true);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [props.ruleParams.indexId, dataView?.id, props.data.indexPatterns]);

  function getDataViewError() {
    const validationError = props.getValidationError('index');
    if (validationError) {
      return validationError;
    }

    if (dataView && dateFields.length === 0) {
      return i18n.translate('xpack.stackAlerts.geoContainment.noDateFieldInIndexPattern.message', {
        defaultMessage: 'Data view does not contain date fields.',
      });
    }

    if (dataView && geoFields.length === 0) {
      return i18n.translate('xpack.stackAlerts.geoContainment.noGeoFieldInIndexPattern.message', {
        defaultMessage:
          'Data view does not contain geospatial fields. Must have one of type: {geoFieldTypes}.',
        values: {
          geoFieldTypes: ENTITY_GEO_FIELD_TYPES.join(', '),
        },
      });
    }

    if (dataViewNotFound) {
      return i18n.translate('xpack.stackAlerts.geoContainment.dataViewNotFound', {
        defaultMessage: `Unable to find data view ''{id}''`,
        values: { id: props.ruleParams.indexId },
      });
    }

    return null;
  }

  const dataViewError = getDataViewError();
  const dateFieldError = props.getValidationError('dateField');
  const geoFieldError = props.getValidationError('geoField');
  const entityFieldError = props.getValidationError('entity');

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.geoContainment.entitiesFormLabel"
            defaultMessage="Entities"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiSkeletonText lines={3} size="s" isLoading={isLoading}>
        <EuiFormRow
          error={dataViewError}
          isInvalid={Boolean(dataViewError)}
          label={i18n.translate('xpack.stackAlerts.geoContainment.dataViewLabel', {
            defaultMessage: 'Data view',
          })}
          data-test-subj="entitiesDataView"
        >
          <DataViewSelect
            dataViewId={props.ruleParams.indexId}
            data={props.data}
            isInvalid={Boolean(dataViewError)}
            onChange={(nextDataView: DataView) => {
              if (!nextDataView.id) {
                return;
              }
              props.setDataViewId(nextDataView.id);
              props.setDataViewTitle(nextDataView.title);

              const nextDateFields = getDateFields(nextDataView.fields);
              if (nextDateFields.length) {
                props.setDateField(nextDateFields[0].name);
              } else if ('dateField' in props.ruleParams) {
                props.setDateField('');
              }

              // do not attempt to auto select entity field
              // there can be many matches so auto selecting the correct field is improbable
              if ('entity' in props.ruleParams) {
                props.setEntityField('');
              }

              const nextGeoFields = getGeoFields(nextDataView.fields);
              if (nextGeoFields.length) {
                props.setGeoField(nextGeoFields[0].name);
              } else if ('geoField' in props.ruleParams) {
                props.setGeoField('');
              }
            }}
            unifiedSearch={props.unifiedSearch}
          />
        </EuiFormRow>

        {props.ruleParams.indexId && (
          <>
            <EuiFormRow
              error={dateFieldError}
              isInvalid={Boolean(dateFieldError)}
              label={i18n.translate('xpack.stackAlerts.geoContainment.timeFieldLabel', {
                defaultMessage: 'Time',
              })}
            >
              <SingleFieldSelect
                isInvalid={Boolean(dateFieldError)}
                placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectTimeLabel', {
                  defaultMessage: 'Select time field',
                })}
                value={props.ruleParams.dateField}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setDateField(fieldName);
                  }
                }}
                fields={dateFields}
              />
            </EuiFormRow>

            <EuiFormRow
              error={geoFieldError}
              isInvalid={Boolean(geoFieldError)}
              label={i18n.translate('xpack.stackAlerts.geoContainment.geofieldLabel', {
                defaultMessage: 'Location',
              })}
            >
              <SingleFieldSelect
                isInvalid={Boolean(geoFieldError)}
                placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectGeoLabel', {
                  defaultMessage: 'Select location field',
                })}
                value={props.ruleParams.geoField}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setGeoField(fieldName);
                  }
                }}
                fields={geoFields}
              />
            </EuiFormRow>

            <EuiFormRow
              error={entityFieldError}
              isInvalid={Boolean(entityFieldError)}
              label={i18n.translate('xpack.stackAlerts.geoContainment.entityfieldLabel', {
                defaultMessage: 'Entity',
              })}
            >
              <SingleFieldSelect
                isInvalid={Boolean(entityFieldError)}
                placeholder={i18n.translate(
                  'xpack.stackAlerts.geoContainment.topHitsSplitFieldSelectPlaceholder',
                  {
                    defaultMessage: 'Select entity field',
                  }
                )}
                value={props.ruleParams.entity}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setEntityField(fieldName);
                  }
                }}
                fields={entityFields}
              />
            </EuiFormRow>

            <EuiFormRow
              helpText={i18n.translate('xpack.stackAlerts.geoContainment.entityFilterHelpText', {
                defaultMessage: 'Add a filter to narrow entities.',
              })}
              label={i18n.translate('xpack.stackAlerts.geoContainment.filterLabel', {
                defaultMessage: 'Filter',
              })}
            >
              <QueryInput
                dataView={dataView}
                onChange={(query: Query) => {
                  props.setQuery(query);
                }}
                query={props.ruleParams.indexQuery}
              />
            </EuiFormRow>
          </>
        )}
      </EuiSkeletonText>
    </EuiPanel>
  );
};
