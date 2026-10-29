/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ImportResponse } from '@kbn/alerting-v2-schemas';
import { useImportConnectorTypes } from '../../hooks/use_import_connector_types';
import { ConnectorTypeIcon } from './connector_type_icon';

export const CUSTOM_IMPORT_LABEL = i18n.translate('xpack.alertingV2.imports.kind.custom', {
  defaultMessage: 'Custom import',
});

export const isManagedImport = ({ kind }: Pick<ImportResponse, 'kind'>): boolean =>
  kind === 'managed';

/**
 * What kind of import this is, in words: "Custom import", or the display name of the connector
 * type for a managed one. Falls back to the source while the connector types load.
 */
export const useImportKindLabel = (config: ImportResponse): string => {
  const { data: connectorTypes } = useImportConnectorTypes();
  if (!isManagedImport(config)) {
    return CUSTOM_IMPORT_LABEL;
  }
  return connectorTypes?.find(({ id }) => id === config.connector_type_id)?.name ?? config.source;
};

/** The logo of the connector for a managed import, a generic icon for a custom one. */
export const ImportKindIcon = ({
  config,
  size = 'm',
}: {
  config: ImportResponse;
  size?: EuiIconProps['size'];
}) =>
  isManagedImport(config) ? (
    <ConnectorTypeIcon
      connectorTypeId={config.connector_type_id}
      size={size}
      data-test-subj={`importsKindIcon-${config.id}`}
    />
  ) : (
    <EuiIcon type="link" size={size} aria-hidden={true} />
  );
