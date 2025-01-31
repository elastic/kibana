/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { SourcePicker, SourcePickerProps } from './source_picker';

export function SourceModal(props: SourcePickerProps) {
  return (
    <div className="gphSourceModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.graph.sourceModal.title"
            defaultMessage="Select a data source"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <SourcePicker {...props} />
      </EuiModalBody>
    </div>
  );
}
