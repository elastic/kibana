/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FALLBACK_OSQUERY_VERSION } from '../../../common/constants';
import { useOsquerySchema } from '../../common/hooks/use_osquery_schema';
import { getOsqueryVersionOptions, isLiveOsqueryVersion } from './osquery_version_options';

export const useOsqueryVersionOptions = () => {
  const { osqueryVersion, pkgVersion, isLoading } = useOsquerySchema();

  const options = useMemo(() => getOsqueryVersionOptions(osqueryVersion), [osqueryVersion]);

  // `osqueryVersion` is the osquery release the installed Osquery Manager package
  // was built against (`metadata.osquery_version`), not what agents run: each
  // agent runs the osquery bundled with its Elastic Agent version. The server
  // omits `pkgVersion` when it serves the bundled fallback schema, so the version
  // is then a hardcoded default rather than the package's.
  const isKnownToPackage = !!pkgVersion && isLiveOsqueryVersion(osqueryVersion);

  const helpText = useMemo(() => {
    if (isLoading) {
      return i18n.translate('xpack.osquery.versionField.helpTextBase', {
        defaultMessage: 'osquery agent version, not the integration version.',
      });
    }

    if (isKnownToPackage) {
      return i18n.translate('xpack.osquery.versionField.helpTextPackageVersion', {
        defaultMessage:
          'osquery agent version, not the integration version. Latest osquery known to Osquery Manager {pkgVersion}: {osqueryVersion}. Agents run the osquery bundled with their Elastic Agent version.',
        values: { osqueryVersion, pkgVersion },
      });
    }

    return i18n.translate('xpack.osquery.versionField.helpTextNoReportedVersion', {
      defaultMessage:
        'osquery agent version, not the integration version. No osquery version reported by Osquery Manager; listing versions up to {fallbackVersion}. Agents run the osquery bundled with their Elastic Agent version.',
      values: { fallbackVersion: FALLBACK_OSQUERY_VERSION },
    });
  }, [isLoading, isKnownToPackage, osqueryVersion, pkgVersion]);

  return { options, osqueryVersion, pkgVersion, helpText };
};
