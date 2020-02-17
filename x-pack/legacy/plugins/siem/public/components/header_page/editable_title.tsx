/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFieldText } from '@elastic/eui';

interface Props {
  submitTitle: string;
  cancelTitle: string;
  isLoading: boolean;
  title: string | React.ReactNode;
  isEditTitle?: boolean;
  onChange: (a: string) => void;
  onClick: (b: boolean) => void;
  onSubmit: () => void;
}

const EditableTitleComponent: React.FC<Props> = ({
  onChange,
  onClick,
  onSubmit,
  isLoading,
  title,
  submitTitle,
  cancelTitle,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <EuiFieldText onChange={e => onChange(e.target.value)} value={`${title}`} />
    </EuiFlexItem>
    <EuiFlexGroup gutterSize="none" responsive={false} wrap={true}>
      <EuiFlexItem grow={false}>
        <EuiButton fill isDisabled={isLoading} isLoading={isLoading} onClick={onSubmit}>
          {submitTitle}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={() => onClick(false)}>{cancelTitle}</EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexItem />
  </EuiFlexGroup>
);

export const EditableTitle = React.memo(EditableTitleComponent);
