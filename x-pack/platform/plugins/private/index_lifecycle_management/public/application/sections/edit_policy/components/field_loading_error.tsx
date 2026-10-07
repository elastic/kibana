/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

interface Props {
  title: React.ReactNode;
  body: React.ReactNode;
  buttonLabel: string;
  resendRequest: () => void;
  'data-test-subj'?: string;
}

export const FieldLoadingError: FunctionComponent<Props> = (props) => {
  const { title, body, buttonLabel, resendRequest } = props;
  return (
    <>
      <EuiSpacer size="m" />
      <KbnWarningCallout
        data-test-subj={props['data-test-subj']}
        title={title}
        text={body}
        actionProps={{
          primary: {
            children: buttonLabel,
            onClick: resendRequest,
          },
        }}
      />
    </>
  );
};
