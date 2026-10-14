/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { CollectionVariant } from '../card_utils';
import { VariantRow } from './variant_row';

export interface CollectionFlyoutProps {
  title: string;
  description: string;
  variants: readonly CollectionVariant[];
  onClose: () => void;
}

/**
 * Chooser flyout for a technology that ships several collection variants.
 * Opened when `?collection=<groupId>` is present in the browse page URL.
 */
export const CollectionFlyout = ({
  title,
  description,
  variants,
  onClose,
}: CollectionFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'collectionFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="collectionFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {variants.map((variant) => (
            <EuiFlexItem key={variant.id}>
              <VariantRow variant={variant} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
