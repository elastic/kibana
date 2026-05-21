/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mirrors EuiFlyout session menu back + history popover (see GCP child flyout in
 * Observability onboarding version 2) for use inside the centered catalog modal.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';

export interface CatalogModalHistoryEntry {
  readonly id: string;
  readonly title: string;
  readonly iconType?: IconType;
}

export interface CatalogModalNavigationProps {
  readonly history: readonly CatalogModalHistoryEntry[];
  readonly onBack: () => void;
  readonly onSelectHistoryIndex: (index: number) => void;
}

export const CatalogModalNavigation: React.FC<CatalogModalNavigationProps> = ({
  history,
  onBack,
  onSelectHistoryIndex,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const historyMenuItems = useMemo(() => {
    if (history.length <= 1) {
      return [
        <EuiContextMenuItem key="empty" disabled>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.dataSources.catalogModal.historyEmpty', {
              defaultMessage: 'No history',
            })}
          </EuiText>
        </EuiContextMenuItem>,
      ];
    }

    return history.map((entry, index) => {
      const isCurrent = index === history.length - 1;
      return (
        <React.Fragment key={entry.id}>
          {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
          <EuiContextMenuItem
            disabled={isCurrent}
            icon={entry.iconType ? <EuiIcon type={entry.iconType} size="m" /> : undefined}
            onClick={() => {
              if (!isCurrent) {
                onSelectHistoryIndex(index);
                setIsHistoryOpen(false);
              }
            }}
          >
            {entry.title}
          </EuiContextMenuItem>
        </React.Fragment>
      );
    });
  }, [history, onSelectHistoryIndex]);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="arrowLeft"
          onClick={onBack}
          data-test-subj="streamsCatalogModalBackToBrowse"
        >
          {i18n.translate('xpack.streams.dataSources.catalogModal.back', {
            defaultMessage: 'Back',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isHistoryOpen}
          closePopover={() => setIsHistoryOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          button={
            <EuiButtonIcon
              size="xs"
              color="text"
              display="empty"
              iconType="arrowDown"
              aria-label={i18n.translate('xpack.streams.dataSources.catalogModal.historyAria', {
                defaultMessage: 'Navigation history',
              })}
              data-test-subj="streamsCatalogModalHistory"
              onClick={() => setIsHistoryOpen((open) => !open)}
            />
          }
        >
          <EuiContextMenuPanel size="s" items={historyMenuItems} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
