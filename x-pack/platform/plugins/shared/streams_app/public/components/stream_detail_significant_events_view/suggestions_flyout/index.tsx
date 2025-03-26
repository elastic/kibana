/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamQueryKql } from '@kbn/streams-schema';
import React, { useState } from 'react';
import { without } from 'lodash';
import { SignificantEventSuggestionsList } from './suggestions_list';

interface SignificantEventSuggestionsFlyoutProps {
  name: string;
  onClose?: () => void;
  suggestions: StreamQueryKql[];
  onAccept?: (queries: StreamQueryKql[]) => void;
}
export function SignificantEventSuggestionsFlyout({
  name,
  suggestions,
  onAccept,
  onClose,
}: SignificantEventSuggestionsFlyoutProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState(suggestions);

  return (
    <EuiFlyout
      onClose={() => {
        onClose?.();
      }}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.significantEventsSuggestionsFlyout.title', {
              defaultMessage: 'Suggested significant event queries',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SignificantEventSuggestionsList
          name={name}
          suggestions={suggestions}
          selected={selectedSuggestions}
          onSuggestionClick={(suggestion) => {
            setSelectedSuggestions((prev) =>
              selectedSuggestions.includes(suggestion)
                ? without(prev, suggestion)
                : prev.concat(suggestion)
            );
          }}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiButton
            color="text"
            onClick={() => {
              onClose?.();
            }}
          >
            {i18n.translate('xpack.significantEventSuggestionsFlyout.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButton>
          <EuiButton
            color="primary"
            fill
            iconType="plusInCircle"
            onClick={() => {
              onAccept?.(selectedSuggestions);
            }}
          >
            {i18n.translate(
              'xpack.significantEventSuggestionsFlyout.acceptSuggestionsButtonLabel',
              {
                defaultMessage: 'Accept selected suggestions',
              }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
