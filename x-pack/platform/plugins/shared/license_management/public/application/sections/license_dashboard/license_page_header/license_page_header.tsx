/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { useSelector } from 'react-redux-v7';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderBadge } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';

import { getLicenseState } from '../../../store/reducers/license_management';

interface LicenseInfo {
  type: string;
  status: string;
  isExpired: boolean;
  expirationDate: string | null;
}

const getTitle = (license: LicenseInfo): string => {
  if (license.isExpired) {
    return i18n.translate(
      'xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusTitle',
      {
        defaultMessage: 'Your {licenseType} license has expired',
        values: {
          licenseType: license.type,
        },
      }
    );
  }

  return i18n.translate(
    'xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusTitle',
    {
      defaultMessage: 'Your {licenseType} license is {status}',
      values: {
        licenseType: license.type,
        status: license.status,
      },
    }
  );
};

const getDescription = (license: LicenseInfo): string => {
  if (license.isExpired) {
    return i18n.translate(
      'xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusDescription',
      {
        defaultMessage: 'Your license expired on {licenseExpirationDate}',
        values: {
          licenseExpirationDate: license.expirationDate ?? '',
        },
      }
    );
  }

  if (license.expirationDate) {
    return i18n.translate(
      'xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusDescription',
      {
        defaultMessage: 'Your license will expire on {licenseExpirationDate}',
        values: {
          licenseExpirationDate: license.expirationDate,
        },
      }
    );
  }

  return i18n.translate(
    'xpack.licenseMgmt.licenseDashboard.licenseStatus.permanentActiveLicenseStatusDescription',
    {
      defaultMessage: 'Your license will never expire.',
    }
  );
};

const getStatusBadge = (license: LicenseInfo): AppHeaderBadge => ({
  label: capitalize(license.status),
  color: license.isExpired ? 'danger' : 'success',
});

export const LicensePageHeader: FC = () => {
  const license = useSelector(getLicenseState);

  return (
    <>
      <AppHeader
        title={getTitle(license)}
        description={getDescription(license)}
        badges={[getStatusBadge(license)]}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
    </>
  );
};
