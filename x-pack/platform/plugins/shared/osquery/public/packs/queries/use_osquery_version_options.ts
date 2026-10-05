/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useOsquerySchema } from '../../common/hooks/use_osquery_schema';
import { getOsqueryVersionOptions } from './osquery_version_options';

export const useOsqueryVersionOptions = () => {
  const { osqueryVersion, pkgVersion } = useOsquerySchema();

  const options = useMemo(() => getOsqueryVersionOptions(osqueryVersion), [osqueryVersion]);

  const helpText = useMemo(
    () =>
      pkgVersion
        ? i18n.translate('xpack.osquery.versionField.helpTextWithIntegration', {
            defaultMessage:
              'osquery agent version, not the integration version. Detected: {osqueryVersion} (Osquery Manager {pkgVersion})',
            values: { osqueryVersion, pkgVersion },
          })
        : i18n.translate('xpack.osquery.versionField.helpText', {
            defaultMessage:
              'osquery agent version, not the integration version. Detected: {osqueryVersion}',
            values: { osqueryVersion },
          }),
    [osqueryVersion, pkgVersion]
  );

  return { options, osqueryVersion, pkgVersion, helpText };
};
