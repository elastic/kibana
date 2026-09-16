/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const MappingEditorHeader = () => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('xpack.dataFederation.mappingEditor.fieldsTitle', {
              defaultMessage: 'Mapped fields',
            })}
          </h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.dataFederation.mappingEditor.timestampRecommendation"
            defaultMessage="Mapping your timestamp field and renaming it to {timestampField} is recommended."
            values={{ timestampField: <EuiCode>@timestamp</EuiCode> }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
