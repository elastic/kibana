/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { normalizeSecretName } from '@kbn/secrets';
import type { SecretUsageCount, SecretUsageResponse } from '@kbn/secrets';
import type { SecretsApi } from './api';
import { useSecretUsage } from './use_secrets';

interface SecretUsageListProps {
  usage: SecretUsageResponse;
  /** Where an item that uses the secret can be opened. Without it, items are not links. */
  getItemHref?: (id: string) => string;
}

/**
 * The items that use a secret, and how many more there are. The ones the user cannot see are
 * only counted: their names are not for them to know.
 */
export const SecretUsageList = ({
  usage: { items, visibleCount, hiddenCount },
  getItemHref,
}: SecretUsageListProps) => {
  const moreCount = visibleCount - items.length;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      responsive={false}
      data-test-subj="secretUsageList"
    >
      {items.map(({ id, name, enabled }) => (
        <EuiFlexItem key={id} grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              {getItemHref ? (
                <EuiLink href={getItemHref(id)} data-test-subj="secretUsageItemLink">
                  {name}
                </EuiLink>
              ) : (
                <EuiText size="s">{name}</EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color={enabled ? 'success' : 'subdued'}>
                {enabled
                  ? i18n.translate('xpack.secretsUi.usage.enabled', { defaultMessage: 'Enabled' })
                  : i18n.translate('xpack.secretsUi.usage.disabled', {
                      defaultMessage: 'Disabled',
                    })}
              </EuiHealth>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
      {moreCount > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="secretUsageMore">
            {i18n.translate('xpack.secretsUi.usage.more', {
              defaultMessage: 'and {count} more',
              values: { count: moreCount },
            })}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      {hiddenCount > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="secretUsageHidden">
            {i18n.translate('xpack.secretsUi.usage.hidden', {
              defaultMessage: '{count} you cannot see',
              values: { count: hiddenCount },
            })}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

interface SecretUsagePopoverProps extends Pick<SecretUsageListProps, 'getItemHref'> {
  api: SecretsApi;
  name: string;
  totalCount: number;
}

// Lists the items on demand, because that is one request for each secret.
const SecretUsagePopover = ({ api, name, totalCount, getItemHref }: SecretUsagePopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isError, isInitialLoading } = useSecretUsage({ api, name, enabled: isOpen });
  const label = i18n.translate('xpack.secretsUi.usage.showAriaLabel', {
    defaultMessage: 'Show where "{name}" is used',
    values: { name },
  });

  return (
    <EuiPopover
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="m"
      anchorPosition="downLeft"
      button={
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
          aria-label={label}
          data-test-subj="secretUsedByButton"
        >
          {totalCount}
        </EuiButtonEmpty>
      }
    >
      {isInitialLoading ? <EuiLoadingSpinner size="m" /> : null}
      {isError ? (
        <EuiText size="s" data-test-subj="secretUsageError">
          {i18n.translate('xpack.secretsUi.usage.loadError', {
            defaultMessage: 'Where this secret is used could not be loaded.',
          })}
        </EuiText>
      ) : null}
      {data ? <SecretUsageList usage={data} getItemHref={getItemHref} /> : null}
    </EuiPopover>
  );
};

interface SecretUsedByProps extends Pick<SecretUsageListProps, 'getItemHref'> {
  api: SecretsApi;
  name: string;
  /** How many items use each secret, by lowercased secret name. Undefined until they are known. */
  counts: Record<string, SecretUsageCount> | undefined;
}

/** The "Used by" cell of a secret: how many items use it, and a list of them on demand. */
export const SecretUsedBy = ({ api, name, counts, getItemHref }: SecretUsedByProps) => {
  if (!counts) {
    return null;
  }
  const count = counts[normalizeSecretName(name)];
  const totalCount = count ? count.visibleCount + count.hiddenCount : 0;
  if (totalCount === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="secretNotUsed">
        {i18n.translate('xpack.secretsUi.usage.notUsed', { defaultMessage: 'Not used' })}
      </EuiText>
    );
  }
  return (
    <SecretUsagePopover api={api} name={name} totalCount={totalCount} getItemHref={getItemHref} />
  );
};
