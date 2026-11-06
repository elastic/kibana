/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiFormRow,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OnSourceChangeArgs } from '../source';
import { ForceRefreshCheckbox } from '../../../components/force_refresh_checkbox';
import { ESQLEditor } from './esql_editor';
import { NarrowByMapBounds, NarrowByTime } from './narrow_by_field';
import type { getFields } from './esql_utils';
import type { NormalizedESQLSourceDescriptor } from './esql_source';

interface Props {
  onChange(...args: OnSourceChangeArgs[]): void;
  sourceDescriptor: NormalizedESQLSourceDescriptor;
  getDataViewFields: () => Promise<ReturnType<typeof getFields>>;
}

export function UpdateSourceEditor(props: Props) {
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [geoFields, setGeoFields] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let ignore = false;
    props
      .getDataViewFields()
      .then((fields) => {
        if (ignore) {
          return;
        }
        setDateFields(fields.dateFields);
        setGeoFields(fields.geoFields);
        setIsInitialized(true);
      })
      .catch((err) => {
        if (ignore) {
          return;
        }
        setIsInitialized(true);
      });

    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            {i18n.translate('xpack.maps.esqlSearch.sourceEditorTitle', {
              defaultMessage: 'ES|QL',
            })}
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiSkeletonText lines={3} isLoading={!isInitialized}>
          <ESQLEditor
            esql={props.sourceDescriptor.esql}
            onESQLChange={(change) => {
              setDateFields(change.dateFields);
              setGeoFields(change.geoFields);
              const changes: OnSourceChangeArgs[] = [
                { propName: 'dataViewId', value: change.adhocDataViewId },
                { propName: 'esql', value: change.esql },
              ];
              function ensureField(key: 'date_field' | 'geo_field', fields: string[]) {
                if (props.sourceDescriptor[key] && !fields.includes(props.sourceDescriptor[key]!)) {
                  const value = fields.length ? fields[0] : undefined;
                  changes.push({
                    propName: key,
                    value,
                  });
                  // uncheck narrowing if there are no fields
                  if (!value) {
                    changes.push({
                      propName:
                        key === 'date_field' ? 'narrow_by_global_time' : 'narrow_by_map_bounds',
                      value: false,
                    });
                  }
                }
              }
              ensureField('date_field', change.dateFields);
              ensureField('geo_field', change.geoFields);
              props.onChange(...changes);
            }}
          />

          <EuiSpacer size="m" />

          <NarrowByMapBounds
            esql={props.sourceDescriptor.esql}
            field={props.sourceDescriptor.geo_field}
            fields={geoFields}
            narrowByField={props.sourceDescriptor.narrow_by_map_bounds}
            onFieldChange={(fieldName: string) => {
              props.onChange({ propName: 'geo_field', value: fieldName });
            }}
            onNarrowByFieldChange={(narrowByField: boolean) => {
              const changes: OnSourceChangeArgs[] = [
                { propName: 'narrow_by_map_bounds', value: narrowByField },
              ];
              // auto select first geo field when enabling narrowByMapBounds and geoField is not set
              if (narrowByField && geoFields.length && !props.sourceDescriptor.geo_field) {
                changes.push({ propName: 'geo_field', value: geoFields[0] });
              }
              props.onChange(...changes);
            }}
          />

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.maps.esqlSource.narrowByGlobalSearchLabel', {
                defaultMessage: `Apply global search to ES|QL statement`,
              })}
              checked={props.sourceDescriptor.narrow_by_global_search}
              onChange={(event: EuiSwitchEvent) => {
                props.onChange({
                  propName: 'narrow_by_global_search',
                  value: event.target.checked,
                });
              }}
              compressed
            />
          </EuiFormRow>

          <NarrowByTime
            esql={props.sourceDescriptor.esql}
            field={props.sourceDescriptor.date_field}
            fields={dateFields}
            narrowByField={props.sourceDescriptor.narrow_by_global_time}
            onFieldChange={(fieldName: string) => {
              props.onChange({ propName: 'date_field', value: fieldName });
            }}
            onNarrowByFieldChange={(narrowByField: boolean) => {
              const changes: OnSourceChangeArgs[] = [
                { propName: 'narrow_by_global_time', value: narrowByField },
              ];
              // auto select first date field when enabling narrowByGlobalTime and dateField is not set
              if (narrowByField && dateFields.length && !props.sourceDescriptor.date_field) {
                changes.push({ propName: 'date_field', value: dateFields[0] });
              }
              props.onChange(...changes);
            }}
          />

          <ForceRefreshCheckbox
            applyForceRefresh={props.sourceDescriptor.apply_force_refresh}
            setApplyForceRefresh={(applyForceRefresh: boolean) => {
              props.onChange({ propName: 'apply_force_refresh', value: applyForceRefresh });
            }}
          />
        </EuiSkeletonText>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}
