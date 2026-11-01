/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { StreamsUnit } from '@kbn/streams-schema';

/** Why the configuration service did not accept the processor, when it answered at all. */
export type CheckOutcome =
  | {
      kind: 'rejected';
      /** Diagnostics no field could show. */
      unmatched: StreamsUnit.Diagnostic[];
      /** How many fields show a diagnostic of their own. */
      highlightedCount: number;
    }
  | { kind: 'failed'; message: string };

export function CheckOutcomeCallout({ outcome }: { outcome: CheckOutcome | undefined }) {
  if (!outcome) {
    return null;
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
            {unmatched.length > 0 ? (
              <ul>
                {unmatched.map(({ code, message }, index) => (
                  <li key={`${code}-${index}`}>
                    {code ? <strong>{code}: </strong> : null}
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        }
        data-test-subj="streamsProcessingFlyoutEditorDiagnostics"
      />
    </>
  );
}
