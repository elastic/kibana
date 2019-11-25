/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiCallOut } from '@elastic/eui';

interface Props {
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
  onClick: (templateType: 'inline' | 'stored') => void;
}

export const AddRoleTemplateButton = (props: Props) => {
  if (!props.canUseStoredScripts && !props.canUseInlineScripts) {
    return (
      <EuiCallOut iconType="alert" color="danger" title={'Role templates unavailable'}>
        <p>Role templates cannot be used when scripts are disabled in Elasticsearch</p>
      </EuiCallOut>
    );
  }

  if (props.canUseInlineScripts) {
    return (
      <EuiButtonEmpty iconType="plusInCircle" onClick={() => props.onClick('inline')}>
        Add role template
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButtonEmpty iconType="plusInCircle" onClick={() => props.onClick('stored')}>
      Add role template
    </EuiButtonEmpty>
  );
};
