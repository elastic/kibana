/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { Rule } from '../../../../types';
import { useLinkedObject } from '../hooks/use_linked_object';

export interface ViewLinkedObjectProps {
  rule: Rule;
}

export const ViewLinkedObject: React.FunctionComponent<ViewLinkedObjectProps> = ({ rule }) => {
  const { linkUrl, buttonText } = useLinkedObject({ rule });

  if (!linkUrl || !buttonText) {
    return null;
  }

  return (
    <EuiButtonEmpty
      color="primary"
      href={linkUrl}
      data-test-subj="ruleDetails-viewLinkedObject"
      iconType="eye"
      aria-label={buttonText}
    >
      {buttonText}
    </EuiButtonEmpty>
  );
};
