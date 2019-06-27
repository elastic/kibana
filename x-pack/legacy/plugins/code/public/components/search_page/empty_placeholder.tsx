/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

export const EmptyPlaceholder = (props: any) => {
  return (
    <div>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiText
        textAlign="center"
        className="eui-textTruncate"
        style={{ fontSize: '24px', color: '#98A2B3' }}
      >
        "
        <span className="eui-textTruncate eui-displayInlineBlock" style={{ maxWidth: '90%' }}>
          {props.query}
        </span>
        "
      </EuiText>
      <EuiSpacer size="xl" />
      <EuiText textAlign="center" style={{ fontSize: '28px', color: '#1A1A1A' }}>
        Hmmm... we looked for that, but couldn’t find anything.
      </EuiText>
      <EuiSpacer size="xl" />
      <EuiText textAlign="center" color="subdued">
        You can search for something else or modify your search settings.
      </EuiText>
      <EuiSpacer size="l" />
      <EuiText textAlign="center">
        <EuiButton
          fill={true}
          onClick={() => {
            if (props.toggleOptionsFlyout) {
              props.toggleOptionsFlyout();
            }
          }}
        >
          Modify your search settings
        </EuiButton>
      </EuiText>
    </div>
  );
};
