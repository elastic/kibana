/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { StreamsUnit } from '@kbn/streams-schema';

/** What the configuration service had to say about the processor, when it answered at all. */
export type CheckOutcome =
  | {
      kind: 'rejected';
      /** Diagnostics no field could show. */
      unmatched: StreamsUnit.Diagnostic[];
      /** How many fields show a diagnostic of their own. */
      highlightedCount: number;
    }
  | {
      /** The processor is valid, but the service pointed out something to consider. */
      kind: 'warned';
      diagnostics: StreamsUnit.Diagnostic[];
    }
  | { kind: 'failed'; message: string };

const DiagnosticList = ({ diagnostics }: { diagnostics: StreamsUnit.Diagnostic[] }) => (
  <ul>
    {diagnostics.map(({ code, message }, index) => (
      <li key={`${code}-${index}`}>
        {code ? <strong>{code}: </strong> : null}
        {message}
      </li>
    ))}
  </ul>
);

export function CheckOutcomeCallout({
  outcome,
  onCommitAnyway,
}: {
  outcome: CheckOutcome | undefined;
  /** Commits the processor despite the warnings it was checked with. */
  onCommitAnyway: () => void;
}) {
  if (!outcome) {
    return null;
  }
  if (outcome.kind === 'warned') {
    return (
      <>
        <EuiSpacer size="m" />
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.streams.processingFlyout.editor.warnedTitle', {
            defaultMessage: 'This processor configuration has warnings',
          })}
          text={
            <>
              <DiagnosticList diagnostics={outcome.diagnostics} />
              <EuiButton
                size="s"
                color="warning"
                onClick={onCommitAnyway}
                data-test-subj="streamsProcessingFlyoutEditorCommitAnyway"
              >
                {i18n.translate('xpack.streams.processingFlyout.editor.commitAnyway', {
                  defaultMessage: 'Continue anyway',
                })}
              </EuiButton>
            </>
          }
          data-test-subj="streamsProcessingFlyoutEditorWarnings"
        />
      </>
    );
  }
  if (outcome.kind === 'failed') {
    return (
      <>
        <EuiSpacer size="m" />
        <KbnDangerCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.streams.processingFlyout.editor.checkFailedTitle', {
            defaultMessage: 'This processor could not be checked',
          })}
          text={outcome.message}
          data-test-subj="streamsProcessingFlyoutEditorCheckFailed"
        />
      </>
    );
  }
  const { highlightedCount, unmatched } = outcome;
  return (
    <>
      <EuiSpacer size="m" />
      <KbnDangerCallout
        announceOnMount
        size="s"
        title={i18n.translate('xpack.streams.processingFlyout.editor.invalidTitle', {
          defaultMessage: 'This processor configuration is not valid',
        })}
        text={
          <>
            {highlightedCount > 0 ? (
              <p>
                {i18n.translate('xpack.streams.processingFlyout.editor.invalidFields', {
                  defaultMessage:
                    'Fix the {count, plural, one {highlighted field} other {# highlighted fields}} above.',
                  values: { count: highlightedCount },
                })}
              </p>
            ) : null}
            {unmatched.length > 0 ? <DiagnosticList diagnostics={unmatched} /> : null}
          </>
        }
        data-test-subj="streamsProcessingFlyoutEditorDiagnostics"
      />
    </>
  );
}
