/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { i18n } from '@kbn/i18n';
import { castArray } from 'lodash';
import type { ObservablePost } from '../../../common/types/api';
import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_HOSTNAME,
} from '../../../common/constants/observables';

export const getIPType = (ip: string): 'IPV4' | 'IPV6' => {
  if (ip.includes(':')) {
    return 'IPV6';
  }
  return 'IPV4';
};

// https://www.elastic.co/docs/reference/ecs/ecs-hash
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

// https://www.elastic.co/docs/reference/ecs/ecs-hash
const HASH_PARENTS = ['dll', 'file', 'process'] as const;

export const getHashValues = (ecsData: Ecs): string[] => {
  const res: string[] = [];

  HASH_PARENTS.forEach((parent) => {
    HASH_FIELDS.forEach((field) => {
      const value = ecsData[parent]?.hash?.[field];
      if (value) {
        res.push(...castArray(value));
      }
    });
  });

  return res;
};

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

export const getObservablesFromEcs = (ecsData: Ecs): ObservablePost[] => {
  const observablesMap = new Map<string, ObservablePost>();

  const description = i18n.translate('xpack.cases.caseView.observables.autoExtract.description', {
    defaultMessage: 'Auto extracted observable',
  });

  // Source IP
  if (ecsData.source?.ip) {
    const ips = castArray(ecsData.source.ip);
    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      processObservable(
        observablesMap,
        ip,
        ipType === 'IPV4' ? OBSERVABLE_TYPE_IPV4.key : OBSERVABLE_TYPE_IPV6.key,
        description
      );
    });
  }

  // Destination IP
  if (ecsData.destination?.ip) {
    const ips = castArray(ecsData.destination.ip);

    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      processObservable(
        observablesMap,
        ip,
        ipType === 'IPV4' ? OBSERVABLE_TYPE_IPV4.key : OBSERVABLE_TYPE_IPV6.key,
        description
      );
    });
  }

  // Host name
  if (ecsData.host?.name) {
    const hostnames = castArray(ecsData.host.name);
    hostnames.forEach((name) => {
      processObservable(observablesMap, name, OBSERVABLE_TYPE_HOSTNAME.key, description);
    });
  }

  // File hash
  const hashValues = getHashValues(ecsData);
  if (hashValues.length > 0) {
    hashValues.forEach((hash) => {
      processObservable(observablesMap, hash, OBSERVABLE_TYPE_FILE_HASH.key, description);
    });
  }

  // File path
  if (ecsData.file?.path) {
    const paths = castArray(ecsData.file.path);
    paths.forEach((path) => {
      processObservable(observablesMap, path, OBSERVABLE_TYPE_FILE_PATH.key, description);
    });
  }

  // Domain;
  if (ecsData.dns?.question?.name) {
    const names = castArray(ecsData.dns.question.name);
    names.forEach((name) => {
      processObservable(observablesMap, name, OBSERVABLE_TYPE_DOMAIN.key, description);
    });
  }

  // URL
  // TODO - Pending review

  // Email
  // TODO - Pending review
  // email.from.address, or email.sender.address??
  // if (ecsData.email?.from?.address) {
  //   const addresses = castArray(ecsData.email?.from?.address);
  // addresses.forEach(address => {
  //   observablesMap.set(address, {
  //      typeKey: OBSERVABLE_TYPE_EMAIL.key,
  //      value: address,
  //      description,
  //    });
  // });
  //   );
  // }

  // remove duplicates of key type and value pairs
  return Array.from(observablesMap.values());
};
