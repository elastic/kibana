/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Ecs as ElasticEcs } from '@elastic/ecs';
// import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import type { ObservablePost } from '../types/api';
import {
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_EMAIL,
} from '../constants/observables';

// type Ecs = EcsBase | EcsSecurityExtension;

const getIPType = (ip: string): 'IPV4' | 'IPV6' => {
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
// TODO - support 'email.attachments.file'
const HASH_PARENTS = ['dll', 'file', 'process'] as const;

const getHashValues = (ecsData: ElasticEcs): string[] => {
  const res: string[] = [];

  HASH_PARENTS.forEach((parent) => {
    HASH_FIELDS.forEach((field) => {
      const value = ecsData[parent]?.hash?.[field];
      if (value && typeof value === 'string') {
        res.push(value);
      } else if (Array.isArray(value)) {
        res.push(...value);
      }
    });
  });

  return res;
};

export const getObservablesFromEcsData = (ecsData: ElasticEcs): ObservablePost[] => {
  const observables: ObservablePost[] = [];

  // Source IP
  if (ecsData.source?.ip) {
    const ips = Array.isArray(ecsData.source?.ip) ? ecsData.source?.ip : [ecsData.source?.ip];

    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      observables.push({
        typeKey: ipType === 'IPV4' ? OBSERVABLE_TYPE_IPV4.key : OBSERVABLE_TYPE_IPV6.key,
        value: ip,
        description: null,
      });
    });
  }

  // Destination IP
  if (ecsData.destination?.ip) {
    const ips = Array.isArray(ecsData.destination?.ip)
      ? ecsData.destination?.ip
      : [ecsData.destination?.ip];

    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      observables.push({
        typeKey: ipType === 'IPV4' ? OBSERVABLE_TYPE_IPV4.key : OBSERVABLE_TYPE_IPV6.key,
        value: ip,
        description: null,
      });
    });
  }

  // URL
  // TODO - Pending review

  // Host name
  if (ecsData.host?.name) {
    const hostnames = Array.isArray(ecsData.host?.name) ? ecsData.host?.name : [ecsData.host?.name];
    observables.push(
      ...hostnames.map((name) => ({
        typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
        value: name,
        description: null,
      }))
    );
  }

  // File hash
  const hashValues = getHashValues(ecsData);
  if (hashValues.length > 0) {
    observables.push(
      ...hashValues.map((hash) => ({
        typeKey: OBSERVABLE_TYPE_FILE_HASH.key,
        value: hash,
        description: null,
      }))
    );
  }

  // File path
  if (ecsData.file?.path) {
    const paths = Array.isArray(ecsData.file?.path) ? ecsData.file?.path : [ecsData.file?.path];
    observables.push(
      ...paths.map((path) => ({
        typeKey: OBSERVABLE_TYPE_FILE_PATH.key,
        value: path,
        description: null,
      }))
    );
  }

  // TODO - Pending review
  // email.from.address, or email.sender.address??
  if (ecsData.email?.from?.address) {
    const addresses = Array.isArray(ecsData.email?.from?.address)
      ? ecsData.email?.from?.address
      : [ecsData.email?.from?.address];
    observables.push(
      ...addresses.map((address) => ({
        typeKey: OBSERVABLE_TYPE_EMAIL.key,
        value: address,
        description: null,
      }))
    );
  }
  // Domain
  if (ecsData.dns?.question?.name) {
    const names = Array.isArray(ecsData.dns?.question?.name)
      ? ecsData.dns?.question?.name
      : [ecsData.dns?.question?.name];
    observables.push(
      ...names.map((name) => ({
        typeKey: OBSERVABLE_TYPE_DOMAIN.key,
        value: name,
        description: null,
      }))
    );
  }

  // remove duplicates of key type and value pairs
  return [...new Set(observables.map((obj) => JSON.stringify(obj)))].map((str) => JSON.parse(str));
};
