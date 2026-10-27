/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { SignalGroup } from '../../../../common/http_api/signals';
import { tagLabel, tagDescription } from './signal_format';

interface SignalGroupRowProps {
  group: SignalGroup;
  onView: () => void;
}

/**
 * A single signal group rendered as a compact "issue" card: the humanized tag as a title, a
 * one-line description of what the tag means, and a signal-count badge. The whole card (and its
 * "View details" action) opens the group flyout with the member signals + their traces.
 */
export const SignalGroupRow = ({ group, onView }: SignalGroupRowProps) => (
  <EuiPanel
    // Keep the clickable card a <div>; with onClick, EuiPanel otherwise renders a <button>, which
    // would nest the inner "View details" <button> and clobber role="listitem".
    element="div"
    role="listitem"
    hasBorder
    paddingSize="m"
    data-test-subj="contextSignalGroupRow"
    onClick={(event: React.MouseEvent) => {
      if ((event.target as HTMLElement).closest('button')) {
        return;
      }
      onView();
    }}
    {...getEbtProps({
      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSignalsPanel,
      action: CONTEXT_ENGINE_UI_EBT.action.signals.VIEW_GROUP,
      detail: group.tag,
    })}
  >
    <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h4>{tagLabel(group.tag)}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>{tagDescription(group.tag)}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" data-test-subj="contextSignalGroupCount">
          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.groupCount', {
            defaultMessage: '{count, plural, one {# signal} other {# signals}}',
            values: { count: group.count },
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer size="s" />

    <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="inspect"
          onClick={onView}
          data-test-subj="contextSignalGroupViewDetailsButton"
        >
          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.groupViewDetailsButton', {
            defaultMessage: 'View details',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
