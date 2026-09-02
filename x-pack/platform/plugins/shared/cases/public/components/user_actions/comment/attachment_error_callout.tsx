/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

interface AttachmentErrorCalloutProps {
  title: string;
  announceOnMount?: boolean;
  'data-test-subj'?: string;
}

/**
 * Shared "something is wrong with this attachment" callout. Used both when an
 * attachment type is not registered and as the fallback for a renderer that
 * throws, so the two failure modes look the same to the user.
 */
export const AttachmentErrorCallout = React.memo<AttachmentErrorCalloutProps>(
  ({ title, announceOnMount = false, ...rest }) => (
    <EuiCallOut
      announceOnMount={announceOnMount}
      title={title}
      color="danger"
      iconType="warning"
      {...rest}
    />
  )
);

AttachmentErrorCallout.displayName = 'AttachmentErrorCallout';
