/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

/** What an action could not do, with the reason, below the component whose action it was. */
export const DroppedActions = ({
  reasons,
  onDismiss,
}: {
  reasons: readonly string[];
  onDismiss: () => void;
}) =>
  reasons.length === 0 ? null : (
    <>
      <EuiSpacer size="s" />
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={i18n.translate('xpack.customApp.buttonNode.droppedTitle', {
          defaultMessage: 'Part of that could not be done',
        })}
        onDismiss={onDismiss}
      >
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </KbnWarningCallout>
    </>
  );
