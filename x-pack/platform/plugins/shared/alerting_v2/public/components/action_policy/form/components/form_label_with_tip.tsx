/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import React from 'react';

interface FormLabelWithTipProps {
  label: string;
  tip: string;
  'data-test-subj'?: string;
}

export const FormLabelWithTip = ({ label, tip, 'data-test-subj': dataTestSubj }: FormLabelWithTipProps) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip content={tip} type="info" size="s" data-test-subj={dataTestSubj} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const formLabelWithOptionalTip = (
  label: string,
  tip: string | undefined,
  tipTestSubj?: string
): React.ReactNode => {
  if (!tip) {
    return label;
  }

  return <FormLabelWithTip label={label} tip={tip} data-test-subj={tipTestSubj} />;
};
