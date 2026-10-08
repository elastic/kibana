/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactElement, ReactNode } from 'react';
import React from 'react';

import type { IconType } from '@elastic/eui';
import { EuiCard, EuiIcon } from '@elastic/eui';

interface Props {
  icon: IconType | ReactElement;
  iconAreaLabel?: string;
  title: ReactNode;
  description: ReactNode;
  href?: string;
  onClick?: () => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

// Component for rendering a card which links to the Create Job page, displaying an
// icon, card title, description and link.
export const LinkCard: FC<Props> = ({
  icon,
  iconAreaLabel,
  title,
  description,
  onClick,
  href,
  isDisabled,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiCard
    hasBorder
    hasShadow={false}
    layout="horizontal"
    title={title}
    titleSize="xs"
    titleElement="h3"
    description={description}
    icon={
      typeof icon === 'string' ? (
        <EuiIcon size="xl" type={icon} aria-label={iconAreaLabel} />
      ) : (
        icon
      )
    }
    onClick={onClick}
    href={href}
    isDisabled={isDisabled}
    data-test-subj={dataTestSubj}
  />
);
