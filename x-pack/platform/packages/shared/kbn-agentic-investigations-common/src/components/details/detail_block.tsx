/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAccordion, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';

/** A titled section of the investigation view. Open to begin with, and the title folds it. */
export const DetailsBlock = memo<{
  title: string;
  /** Rendered beside the title, e.g. how many proposals were applied. */
  titleAppend?: React.ReactNode;
  /** Whether the section starts folded. Open by default, so nothing is hidden until asked. */
  initialIsOpen?: boolean;
  children: React.ReactNode;
}>(({ title, titleAppend, initialIsOpen = true, children }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationSection' });
  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen={initialIsOpen}
      paddingSize="s"
      buttonContent={
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      }
      extraAction={titleAppend}
    >
      {children}
    </EuiAccordion>
  );
});

DetailsBlock.displayName = 'DetailsBlock';
