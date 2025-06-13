/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, EuiLink } from '@elastic/eui';
import type { LinkAttachmentPersistedState } from './types';

interface AttachmentChildrenProps {
  persistableStateAttachmentState: LinkAttachmentPersistedState;
}

export const LinkAttachmentChildren: React.FC<AttachmentChildrenProps> = ({
  persistableStateAttachmentState,
}) => {
  const { pathname, label, snapshot } = persistableStateAttachmentState;

  return (
    <>
      <EuiLink href={pathname}>{label}</EuiLink>
      {snapshot?.imgData && (
        <EuiImage key="screenshot" src={snapshot.imgData} alt="screenshot" allowFullScreen />
      )}
    </>
  );
};

LinkAttachmentChildren.displayName = 'LinkAttachmentChildren';

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default LinkAttachmentChildren;
