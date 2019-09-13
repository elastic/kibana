/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';

interface View {
  name: string;
}
interface Props {
  close(): void;
  views: View[];
}

export const WaffleSavedViewsModal = ({ close, views }: Props) => {
  return (
    <EuiOverlayMask>
      <EuiModal onClose={close}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Load Views</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {views.map(v => (
            <EuiText key={v.name}>{v.name}</EuiText>
          ))}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={close}>Cancel</EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
