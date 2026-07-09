/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useCallback } from 'react';
import { EuiAccordion, EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import type { SidebarAccordionId } from './hooks/use_sidebar_accordions_state';

interface SidebarAccordionSectionProps {
  id: SidebarAccordionId;
  title: ReactNode;
  extraAction?: ReactNode;
  isOpen: boolean;
  onToggle: (id: SidebarAccordionId, isOpen: boolean) => void;
  children: ReactNode;
  'data-test-subj'?: string;
}

export const SidebarAccordionSection: FC<SidebarAccordionSectionProps> = ({
  id,
  title,
  extraAction,
  isOpen,
  onToggle,
  children,
  'data-test-subj': dataTestSubj = 'sidebar-accordion-section',
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: `case-view-sidebar-accordion-${id}` });

  const handleToggle = useCallback(
    (nextIsOpen: boolean) => {
      onToggle(id, nextIsOpen);
    },
    [id, onToggle]
  );

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj={dataTestSubj}
      buttonProps={{ 'data-test-subj': `${dataTestSubj}-toggle` }}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={handleToggle}
      extraAction={extraAction}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      }
    >
      <EuiSpacer size="m" />
      {children}
    </EuiAccordion>
  );
};

SidebarAccordionSection.displayName = 'SidebarAccordionSection';
