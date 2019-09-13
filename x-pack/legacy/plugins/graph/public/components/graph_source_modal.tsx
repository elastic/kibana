/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { GraphSourcePicker, GraphSourcePickerProps } from './graph_source_picker';

export function GraphSourceModal(props: GraphSourcePickerProps) {
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.graph.sourceModal.title"
            defaultMessage="Choose index pattern"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <GraphSourcePicker {...props} />
      </EuiModalBody>
    </>
  );
}
