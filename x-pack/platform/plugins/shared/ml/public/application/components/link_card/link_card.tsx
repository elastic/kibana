/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactElement } from 'react';
import React from 'react';

import type { EuiIconProps } from '@elastic/eui';
import { EuiCard } from '@elastic/eui';

interface Props {
  icon: ReactElement;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

// Component for rendering a card which links to the Create Job page, displaying an
// icon, card title, description and link.
export const LinkCard: FC<Props> = ({
  icon,
  title,
  description,
  onClick,
  href,
  isDisabled,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiCard
    hasBorder
    layout="horizontal"
    title={title}
    titleSize="xs"
    titleElement="h3"
    description={description}
    // Custom recognizer logos (e.g. <img>) are still rendered in the icon slot.
    icon={icon as ReactElement<EuiIconProps>}
    onClick={onClick}
    href={href}
    isDisabled={isDisabled}
    data-test-subj={dataTestSubj}
  />
);
