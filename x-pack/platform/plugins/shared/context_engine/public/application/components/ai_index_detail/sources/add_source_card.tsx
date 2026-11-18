/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiCard, useEuiTheme } from '@elastic/eui';
import type { getEbtProps } from '@kbn/ebt-click';
import React from 'react';

interface AddSourceCardProps {
  title: string;
  description: string;
  onClick: () => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
  ebtProps?: ReturnType<typeof getEbtProps>;
}

export const AddSourceCard = ({
  title,
  description,
  onClick,
  isDisabled = false,
  'data-test-subj': dataTestSubj,
  ebtProps,
}: AddSourceCardProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCard
      layout="horizontal"
      hasBorder
      icon={
        <EuiAvatar
          name={title}
          type="space"
          size="m"
          iconType="plus"
          iconSize="m"
          color={euiTheme.colors.backgroundBasePrimary}
          iconColor="primary"
          aria-hidden={true}
        />
      }
      titleSize="xs"
      titleElement="span"
      title={title}
      description={description}
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj={dataTestSubj}
      {...ebtProps}
    />
  );
};
