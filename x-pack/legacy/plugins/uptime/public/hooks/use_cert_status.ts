/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useSelector } from 'react-redux';
import { selectDynamicSettings } from '../state/selectors';

export enum CERT_STATUS {
  OK = 'OK',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
}

export const useCertStatus = (expiryDate?: string) => {
  const dss = useSelector(selectDynamicSettings);

  const expiryThreshold = dss.settings?.certThresholds?.expiration;

  const certValidityDate = new Date(expiryDate ?? '');

  const isValidDate = !isNaN(certValidityDate.valueOf());

  if (!isValidDate) {
    return false;
  }

  const isExpiringSoon = moment(certValidityDate).diff(moment(), 'days') < expiryThreshold!;

  const isExpired = moment(certValidityDate) < moment();

  return isExpired
    ? CERT_STATUS.EXPIRED
    : isExpiringSoon
    ? CERT_STATUS.EXPIRING_SOON
    : CERT_STATUS.OK;
};
