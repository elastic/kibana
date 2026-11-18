/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type ReactNode } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

interface AddSourcePanelProps {
  title: ReactNode;
  pendingCount: number;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  children: ReactNode;
  headerAction?: ReactNode;
  'data-test-subj'?: string;
}

export const AddSourcePanel = ({
  title,
  headerAction,
  pendingCount,
  onClose,
  onConfirm,
  isSaving,
  children,
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
          isDisabled={pendingCount === 0 || isSaving}
          onClick={onConfirm}
          data-test-subj="contextAddSourcesConfirmButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.sources.SAVE,
          })}
        >
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.sources.addSourcesConfirmButton"
            defaultMessage="{count, plural, =0 {Add sources} one {Add source} other {Add # sources}}"
            values={{ count: pendingCount }}
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
