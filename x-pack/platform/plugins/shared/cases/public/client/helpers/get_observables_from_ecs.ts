/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { i18n } from '@kbn/i18n';
import type { ObservablePost } from '../../../common/types/api';

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
// TODO - support 'email.attachments.file'
// https://github.com/elastic/security-team/issues/13709
const HASH_PARENTS = ['dll', 'file', 'process'] as const;

export const getHashValues = (ecsData: Ecs): string[] => {
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

export const getObservablesFromEcs = (ecsData: Ecs): ObservablePost[] => {
  const observables = [];
  const description = i18n.translate(
    'xpack.cases.caseView.observables.autoExtractedObservablesDescription',
    {
      defaultMessage: 'Auto extracted observable',
    }
  );

  // Source IP
  if (ecsData.source?.ip) {
    const ips = Array.isArray(ecsData.source?.ip) ? ecsData.source?.ip : [ecsData.source?.ip];
    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      observables.push({
        typeKey: ipType === 'IPV4' ? 'observable-type-ipv4' : 'observable-type-ipv6',
        value: ip,
        description,
      });
    });
  }

  // Destination IP
  if (ecsData.destination?.ip) {
    const ips = Array.isArray(ecsData.destination.ip)
      ? ecsData.destination.ip
      : [ecsData.destination.ip];

    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      observables.push({
        typeKey: ipType === 'IPV4' ? 'observable-type-ipv4' : 'observable-type-ipv6',
        value: ip,
        description,
      });
    });
  }

  // Host name
  if (ecsData.host?.name) {
    const hostnames = Array.isArray(ecsData.host?.name) ? ecsData.host?.name : [ecsData.host?.name];
    hostnames.forEach((name) => {
      observables.push({
        typeKey: 'observable-type-hostname',
        value: name,
        description,
      });
    });
  }

  // File hash
  const hashValues = getHashValues(ecsData);
  if (hashValues.length > 0) {
    observables.push(
      ...hashValues.map((hash) => ({
        typeKey: 'observable-type-file-hash',
        value: hash,
        description,
      }))
    );
  }

  // File path
  if (ecsData.file?.path) {
    const paths = Array.isArray(ecsData.file?.path) ? ecsData.file?.path : [ecsData.file?.path];
    paths.forEach((path) => {
      observables.push({
        typeKey: 'observable-type-file-path',
        value: path,
        description,
      });
    });
  }

  // Domain;
  if (ecsData.dns?.question?.name) {
    const names = Array.isArray(ecsData.dns?.question?.name)
      ? ecsData.dns?.question?.name
      : [ecsData.dns?.question?.name];
    names.forEach((name) => {
      observables.push({
        typeKey: 'observable-type-domain',
        value: name,
        description,
      });
    });
  }

  // URL
  // TODO - Pending review
  // https://github.com/elastic/security-team/issues/13709

  // TODO - Pending review
  // https://github.com/elastic/security-team/issues/13709
  // email.from.address, or email.sender.address??
  // if (ecsData.email?.from?.address) {
  //   const addresses = Array.isArray(ecsData.email?.from?.address)
  //     ? ecsData.email?.from?.address
  //     : [ecsData.email?.from?.address];
  //   observables.push(
  //     ...addresses.map((address) => ({
  //       typeKey: 'observable-type-email',
  //       value: address,
  //       description,
  //     }))
  //   );
  // }

  // remove duplicates of key type and value pairs
  return [...new Set(observables.map((obj) => JSON.stringify(obj)))].map((str) => JSON.parse(str));
};
