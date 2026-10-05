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

  // The server omits `pkgVersion` when it serves the bundled fallback schema, so
  // `osqueryVersion` is then a hardcoded default rather than a detected version.
  const isDetected = !!pkgVersion && isLiveOsqueryVersion(osqueryVersion);

  const helpText = useMemo(() => {
    if (isLoading) {
      return i18n.translate('xpack.osquery.versionField.helpTextBase', {
        defaultMessage: 'osquery agent version, not the integration version.',
      });
    }

    if (isDetected) {
      return i18n.translate('xpack.osquery.versionField.helpTextWithIntegration', {
        defaultMessage:
          'osquery agent version, not the integration version. Detected: {osqueryVersion} (Osquery Manager {pkgVersion})',
        values: { osqueryVersion, pkgVersion },
      });
    }

    return i18n.translate('xpack.osquery.versionField.helpTextNotDetected', {
      defaultMessage:
        'osquery agent version, not the integration version. Installed osquery version not detected; listing versions up to {fallbackVersion}.',
      values: { fallbackVersion: FALLBACK_OSQUERY_VERSION },
    });
  }, [isLoading, isDetected, osqueryVersion, pkgVersion]);

  return { options, osqueryVersion, pkgVersion, helpText };
};
