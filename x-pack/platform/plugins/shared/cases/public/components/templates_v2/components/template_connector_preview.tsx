/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';

import type { ConnectorTypeFields } from '../../../../common/types/domain';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import { getConnectorById } from '../../utils';
import { ConnectorFieldsPreviewForm } from '../../connectors/fields_preview_form';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { MetadataRow } from './metadata_row';
import * as i18n from '../translations';

interface Props {
  connector: CaseConnectorWithoutName;
}

/**
 * Read-only preview of a template's default connector. The template stores only `type` + `id` +
 * raw `fields`, so we resolve it against the configured connectors and delegate rendering of the
 * dynamic fields to the shared `ConnectorFieldsPreviewForm`.
 */
export const TemplateConnectorPreview: FC<Props> = ({ connector }) => {
  const { data: connectors = [], isLoading } = useGetSupportedActionConnectors();

  if (isLoading) {
    return (
      <MetadataRow label={i18n.CONNECTOR_TITLE}>
        <EuiLoadingSpinner size="m" />
      </MetadataRow>
    );
  }

  const resolvedConnector = getConnectorById(connector.id, connectors);

  if (resolvedConnector == null) {
    return (
      <MetadataRow label={i18n.CONNECTOR_TITLE}>
        <EuiText size="s" color="subdued" data-test-subj="template-connector-preview-not-found">
          {i18n.CONNECTOR_NOT_FOUND}
        </EuiText>
      </MetadataRow>
    );
  }

  return (
    <MetadataRow label={i18n.CONNECTOR_TITLE}>
      <div data-test-subj="template-connector-preview">
        <ConnectorFieldsPreviewForm
          connector={resolvedConnector}
          fields={connector.fields as ConnectorTypeFields['fields']}
        />
      </div>
    </MetadataRow>
  );
};

TemplateConnectorPreview.displayName = 'TemplateConnectorPreview';
