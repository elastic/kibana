/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSkeletonRectangle,
  useGeneratedHtmlId,
} from '@elastic/eui';

interface MitigationAccordionProps {
  title: string;
  isLoading: boolean;
  dataTestSubjPrefix: string;
  children: React.ReactNode;
  initialIsOpen?: boolean;
}

export function MitigationAccordion({
  title,
  isLoading,
  dataTestSubjPrefix,
  children,
  initialIsOpen = false,
}: MitigationAccordionProps) {
  // The prefix must be a valid HTML id fragment, so the localized `title` cannot be used here:
  // it contains spaces which would produce an invalid `aria-controls` reference on the accordion button.
  const accordionId = useGeneratedHtmlId({
    prefix: dataTestSubjPrefix,
  });

  return (
    <EuiSkeletonRectangle
      isLoading={isLoading}
      contentAriaLabel={title}
      width="100%"
      height={300}
      borderRadius="none"
      data-test-subj={`${dataTestSubjPrefix}Loading`}
    >
      <EuiPanel hasBorder grow={false}>
        <EuiAccordion
          id={accordionId}
          buttonElement="div"
          buttonContent={<EuiLink>{title}</EuiLink>}
          paddingSize="none"
          initialIsOpen={initialIsOpen}
          data-test-subj={`${dataTestSubjPrefix}Accordion`}
          arrowProps={{ color: 'primary' }}
        >
          <EuiHorizontalRule margin="s" />
          {children}
        </EuiAccordion>
      </EuiPanel>
    </EuiSkeletonRectangle>
  );
}
