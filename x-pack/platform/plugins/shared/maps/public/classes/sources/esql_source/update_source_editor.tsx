/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFormRow,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
import { ForceRefreshCheckbox } from '../../../components/force_refresh_checkbox';
import { getIndexPatternService } from '../../../kibana_services';
import { ESQLEditor } from './esql_editor';
import { NarrowByMapBounds, NarrowByTime } from './narrow_by_field';
import { getFields } from './esql_utils';

interface Props {
  onChange(...args: OnSourceChangeArgs[]): void;
  sourceDescriptor: ESQLSourceDescriptor;
}

export function UpdateSourceEditor(props: Props) {
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [geoFields, setGeoFields] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let ignore = false;
    getIndexPatternService()
      .get(props.sourceDescriptor.dataViewId)
      .then((dataView) => {
        if (ignore) {
          return;
        }
        const fields = getFields(dataView);
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
                { propName: 'columns', value: change.columns },
                { propName: 'dataViewId', value: change.adhocDataViewId },
                { propName: 'esql', value: change.esql },
              ];
              function ensureField(key: 'dateField' | 'geoField', fields: string[]) {
                if (props.sourceDescriptor[key] && !fields.includes(props.sourceDescriptor[key]!)) {
                  const value = fields.length ? fields[0] : undefined;
                  changes.push({
                    propName: key,
                    value,
                  });
                  // uncheck narrowing if there are no fields
                  if (!value) {
                    changes.push({
                      propName: key === 'dateField' ? 'narrowByGlobalTime' : 'narrowByMapBounds',
                      value: false,
                    });
                  }
                }
              }
              ensureField('dateField', change.dateFields);
              ensureField('geoField', change.geoFields);
              props.onChange(...changes);
            }}
          />

          <EuiSpacer size="m" />

          <NarrowByMapBounds
            esql={props.sourceDescriptor.esql}
            field={props.sourceDescriptor.geoField}
            fields={geoFields}
            narrowByField={props.sourceDescriptor.narrowByMapBounds}
            onFieldChange={(fieldName: string) => {
              props.onChange({ propName: 'geoField', value: fieldName });
            }}
            onNarrowByFieldChange={(narrowByField: boolean) => {
              const changes: OnSourceChangeArgs[] = [
                { propName: 'narrowByMapBounds', value: narrowByField },
              ];
              // auto select first geo field when enabling narrowByMapBounds and geoField is not set
              if (narrowByField && geoFields.length && !props.sourceDescriptor.geoField) {
                changes.push({ propName: 'geoField', value: geoFields[0] });
              }
              props.onChange(...changes);
            }}
          />

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.maps.esqlSource.narrowByGlobalSearchLabel', {
                defaultMessage: `Apply global search to ES|QL statement`,
              })}
              checked={props.sourceDescriptor.narrowByGlobalSearch}
              onChange={(event: EuiSwitchEvent) => {
                props.onChange({ propName: 'narrowByGlobalSearch', value: event.target.checked });
              }}
              compressed
            />
          </EuiFormRow>

          <NarrowByTime
            esql={props.sourceDescriptor.esql}
            field={props.sourceDescriptor.dateField}
            fields={dateFields}
            narrowByField={props.sourceDescriptor.narrowByGlobalTime}
            onFieldChange={(fieldName: string) => {
              props.onChange({ propName: 'dateField', value: fieldName });
            }}
            onNarrowByFieldChange={(narrowByField: boolean) => {
              const changes: OnSourceChangeArgs[] = [
                { propName: 'narrowByGlobalTime', value: narrowByField },
              ];
              // auto select first date field when enabling narrowByGlobalTime and dateField is not set
              if (narrowByField && dateFields.length && !props.sourceDescriptor.dateField) {
                changes.push({ propName: 'dateField', value: dateFields[0] });
              }
              props.onChange(...changes);
            }}
          />

          <ForceRefreshCheckbox
            applyForceRefresh={props.sourceDescriptor.applyForceRefresh}
            setApplyForceRefresh={(applyForceRefresh: boolean) => {
              props.onChange({ propName: 'applyForceRefresh', value: applyForceRefresh });
            }}
          />
        </EuiSkeletonText>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}
