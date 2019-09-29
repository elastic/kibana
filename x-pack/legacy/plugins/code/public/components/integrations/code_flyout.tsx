/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { CodeFlyoutMain } from './code_flyout_main';

export const CodeFlyout = (props: {
  repo: string;
  file: string;
  revision: string;
  open: boolean;
  onClose: () => void;
}) => {
  if (props.open) {
    return (
      props.open && (
        <EuiFlyout
          onClose={props.onClose}
          size="l"
          aria-labelledby="flyoutTitle"
          className="code-flyout"
        >
          <CodeFlyoutMain repo={props.repo} file={props.file} revision={props.revision} />
        </EuiFlyout>
      )
    );
  } else return <div />;
};
