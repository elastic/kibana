/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { ObservablePost } from '../../../common/types/api';
import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_AGENT_ID,
} from '../../../common/constants/observables';

const OBSERVABLE_DESCRIPTION = 'Auto extracted observable';

export interface FlattedEcsData {
  field: string;
  value?: string[] | null;
}

const getIPType = (ip: string): 'IPV4' | 'IPV6' => {
  if (ip.includes(':')) {
    return 'IPV6';
  }
  return 'IPV4';
};

const HASH_FIELDS = [
  'cdhash',
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'ssdeep',
  'tlsh',
] as const;
const HASH_PARENTS = ['dll', 'file', 'process'] as const;
const getHashFields = (): string[] =>
  HASH_PARENTS.map((parent) => HASH_FIELDS.map((field) => `${parent}.hash.${field}`)).flat();

const processObservable = (
  observablesMap: Map<string, ObservablePost>,
  value: string,
  typeKey: string
) => {
  const key = `${typeKey}-${value}`;
  if (observablesMap.has(key)) {
    return;
  }
  observablesMap.set(key, {
    typeKey,
    value,
    description: OBSERVABLE_DESCRIPTION,
  });
};

/**
 * Flattens a nested ECS object to field-value pairs.
 * Used when the event snapshot contains the raw ECS document.
 */
export const flattenEcsObject = (
  obj: Record<string, unknown>,
  parentKey = ''
): FlattedEcsData[] => {
  const result: FlattedEcsData[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = parentKey ? `${parentKey}.${key}` : key;

    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result.push(...flattenEcsObject(value as Record<string, unknown>, fieldName));
      } else {
        const valueArr = Array.isArray(value)
          ? value.map((v) => (v != null ? String(v) : '')).filter(Boolean)
          : [String(value)];
        if (valueArr.length > 0) {
          result.push({ field: fieldName, value: valueArr });
        }
      }
    }
  }

  return result;
};

/**
 * Extracts observables from flattened ECS data.
 * Mirrors the logic in public/client/helpers/get_observables_from_ecs.ts.
 */
export const getObservablesFromFlattedEcs = (
  ecsDataArray: FlattedEcsData[][]
): ObservablePost[] => {
  const observablesMap = new Map<string, ObservablePost>();
  const hashFields = getHashFields();

  for (const ecsData of ecsDataArray) {
    for (const datum of ecsData) {
      if (datum.value) {
        if (datum.field === 'source.ip') {
          const ips = castArray(datum.value);
          ips.forEach((ip) => {
            const ipType = getIPType(ip);
            processObservable(
              observablesMap,
              ip,
              ipType === 'IPV4' ? OBSERVABLE_TYPE_IPV4.key : OBSERVABLE_TYPE_IPV6.key
            );
          });
        }
        if (datum.field === 'destination.ip') {
          const ips = castArray(datum.value);
          ips.forEach((ip) => {
            const ipType = getIPType(ip);
            processObservable(
              observablesMap,
              ip,
              ipType === 'IPV4' ? OBSERVABLE_TYPE_IPV4.key : OBSERVABLE_TYPE_IPV6.key
            );
          });
        }
        if (datum.field === 'host.name') {
          const hostnames = castArray(datum.value);
          hostnames.forEach((name) => {
            if (name) {
              processObservable(observablesMap, name, OBSERVABLE_TYPE_HOSTNAME.key);
            }
          });
        }
        if (hashFields.includes(datum.field)) {
          const hashValues = castArray(datum.value);
          hashValues.forEach((hash) => {
            processObservable(observablesMap, hash, OBSERVABLE_TYPE_FILE_HASH.key);
          });
        }
        if (datum.field === 'file.path') {
          const paths = castArray(datum.value);
          paths.forEach((path) => {
            processObservable(observablesMap, path, OBSERVABLE_TYPE_FILE_PATH.key);
          });
        }
        if (datum.field === 'dns.question.name') {
          const names = castArray(datum.value);
          names.forEach((name) => {
            processObservable(observablesMap, name, OBSERVABLE_TYPE_DOMAIN.key);
          });
        }
        if (datum.field === 'agent.id') {
          const agentIds = castArray(datum.value);
          agentIds.forEach((agentId) => {
            processObservable(observablesMap, agentId, OBSERVABLE_TYPE_AGENT_ID.key);
          });
        }
      }
    }
  }

  return Array.from(observablesMap.values());
};
