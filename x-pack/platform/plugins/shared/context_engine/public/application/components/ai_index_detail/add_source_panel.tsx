/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type ReactNode } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { SelectedSource } from '../source_picker';

const getRemovePendingLabel = (label: string): string =>
  i18n.translate('xpack.contextEngine.aiIndexDetail.sources.removePendingSourceLabel', {
    defaultMessage: 'Remove {label} from the selection',
    values: { label },
  });

interface AddSourcePanelProps {
  title: ReactNode;
  pendingSources: SelectedSource[];
  onRemovePending: (source: SelectedSource) => void;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  children: ReactNode;
  headerAction?: ReactNode;
  showPendingList?: boolean;
  'data-test-subj'?: string;
}

export const AddSourcePanel = ({
  title,
  headerAction,
  pendingSources,
  onRemovePending,
  onClose,
  onConfirm,
  isSaving,
  children,
  showPendingList = true,
  'data-test-subj': dataTestSubj,
}: AddSourcePanelProps) => (
  <EuiPanel hasBorder color="subdued" data-test-subj={dataTestSubj}>
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiFlexItem>
      {headerAction ? <EuiFlexItem grow={false}>{headerAction}</EuiFlexItem> : null}
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    {children}
    {showPendingList && pendingSources.length > 0 && (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <ul>
            {pendingSources.map((source) => (
              <li key={`${source.type}:${source.id}`}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>{source.label}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={getRemovePendingLabel(source.label)}>
                      <EuiButtonIcon
                        iconType="cross"
                        size="xs"
                        aria-label={getRemovePendingLabel(source.label)}
                        onClick={() => onRemovePending(source)}
                        isDisabled={isSaving}
                        data-test-subj="contextRemovePendingSourceButton"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </li>
            ))}
          </ul>
        </EuiText>
      </>
    )}
    <EuiSpacer size="m" />
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isSaving}
          data-test-subj="contextAddSourcesCancelButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.sources.CANCEL,
          })}
        >
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.sources.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          isLoading={isSaving}
          isDisabled={pendingSources.length === 0 || isSaving}
          onClick={onConfirm}
          data-test-subj="contextAddSourcesConfirmButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.sources.SAVE,
          })}
        >
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.sources.addSourcesConfirmButton"
            defaultMessage="{count, plural, one {Add source} other {Add # sources}}"
            values={{ count: pendingSources.length }}
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
