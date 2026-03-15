/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { ObservablePost } from '../../../common/types/api';
import { OBSERVABLE_TYPE_IPV4, OBSERVABLE_TYPE_IPV6 } from '../../../common/constants/observables';
import {
  DEFAULT_ECS_FIELD_MAPPINGS,
  buildFieldMappingIndex,
} from '../../../common/observable_types/ecs_field_mappings';

export const getIPType = (ip: string): 'IPV4' | 'IPV6' => {
  if (ip.includes(':')) {
    return 'IPV6';
  }
  return 'IPV4';
};

export type Maybe<T> = T | null;
export interface FlattedEcsData {
  field: string;
  value?: Maybe<string[]>;
}

export const getHashFields = (): string[] =>
  DEFAULT_ECS_FIELD_MAPPINGS.filter((m) => m.ecsField.includes('.hash.')).map((m) => m.ecsField);

export const processObservable = (
  observablesMap: Map<string, ObservablePost>,
  value: string,
  typeKey: string,
  description: string
) => {
  const key = `${typeKey}-${value}`;
  if (observablesMap.has(key)) {
    return;
  }
  observablesMap.set(key, {
    typeKey,
    value,
    description,
  });
};

const fieldMappingIndex = buildFieldMappingIndex(DEFAULT_ECS_FIELD_MAPPINGS);

export const getObservablesFromEcs = (ecsDataArray: FlattedEcsData[][]): ObservablePost[] => {
  const observablesMap = new Map<string, ObservablePost>();

  const description = i18n.translate('xpack.cases.caseView.observables.autoExtract.description', {
    defaultMessage: 'Auto extracted observable',
  });

  for (const ecsData of ecsDataArray) {
    for (const datum of ecsData) {
      if (datum.value) {
        const mapping = fieldMappingIndex.get(datum.field);

        if (mapping) {
          const values = Array.isArray(datum.value) ? datum.value : [datum.value];
          for (const val of values) {
            if (val) {
              const typeKey =
                mapping.strategy === 'ip'
                  ? getIPType(val) === 'IPV4'
                    ? OBSERVABLE_TYPE_IPV4.key
                    : OBSERVABLE_TYPE_IPV6.key
                  : mapping.typeKey;

              processObservable(observablesMap, val, typeKey, description);
            }
          }
        }
      }
    }
  }

  return Array.from(observablesMap.values());
};
