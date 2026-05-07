/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onClose: () => void;
}

export const CreateEntityTypeFlyout = ({ onClose }: Props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'createEntityTypeFlyoutTitle' });

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      data-test-subj="entityCentricLabCreateEntityTypeFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={titleId}>
                {i18n.translate('xpack.streams.entityCentricLab.createFlyout.title', {
                  defaultMessage: 'Create entity type',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('xpack.streams.entityCentricLab.createFlyout.labBadgeLabel', {
                defaultMessage: 'Lab',
              })}
              size="s"
              color="hollow"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.streams.entityCentricLab.createFlyout.description', {
              defaultMessage:
                'Placeholder for the “Create entity type” form. The full create flow ' +
                'is not implemented in this prototype.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
