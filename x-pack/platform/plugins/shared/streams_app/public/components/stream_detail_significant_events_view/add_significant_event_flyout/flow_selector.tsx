/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Flow } from './types';

interface Props {
  selected?: Flow;
  updateSelected: (flow: Flow) => void;
  isSubmitting: boolean;
}

export function FlowSelector({ selected, updateSelected, isSubmitting }: Props) {
  const flowRadioGroupId = useGeneratedHtmlId({ prefix: 'flowRadioGroup' });
  const manualCheckableCardId = useGeneratedHtmlId({
    prefix: 'manualCheckableCard',
  });
  const aiCheckableCardId = useGeneratedHtmlId({
    prefix: 'aiCheckableCard',
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiCheckableCard
        id={aiCheckableCardId}
        label={
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.aiOptionLabel',
                  { defaultMessage: 'Generate significant events with AI' }
                )}
              </h3>
            </EuiTitle>
            <EuiText component="p" color="subdued" size="xs">
              {i18n.translate(
                'xpack.streams.streamDetailView.addSignificantEventFlyout.aiOptionDescription',
                {
                  defaultMessage:
                    'Let AI suggest queries for significant events based on your data patterns, and select from the suggestions.',
                }
              )}
            </EuiText>
          </EuiFlexGroup>
        }
        name={flowRadioGroupId}
        value="ai"
        checked={selected === 'ai'}
        onChange={() => updateSelected('ai')}
        disabled={isSubmitting}
      />
      <EuiCheckableCard
        id={manualCheckableCardId}
        label={
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.manualOptionLabel',
                  { defaultMessage: 'Create significant events from a query' }
                )}
              </h3>
            </EuiTitle>
            <EuiText component="p" color="subdued" size="xs">
              {i18n.translate(
                'xpack.streams.streamDetailView.addSignificantEventFlyout.manualOptionDescription',
                {
                  defaultMessage: 'Write a query to find and add a known significant event.',
                }
              )}
            </EuiText>
          </EuiFlexGroup>
        }
        name={flowRadioGroupId}
        value="manual"
        checked={selected === 'manual'}
        onChange={() => updateSelected('manual')}
        disabled={isSubmitting}
      />
    </EuiFlexGroup>
  );
}
