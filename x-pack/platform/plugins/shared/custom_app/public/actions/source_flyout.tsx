/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppDocument } from '@kbn/custom-app-common';

interface SourceFlyoutProps {
  document: AppDocument;
  /** The title of the panel, so the flyout says whose source it is. */
  panelTitle?: string;
  ariaLabelledBy: string;
}

/** The saved document of a panel, to read and copy when something needs debugging. */
export const SourceFlyout = ({ document, panelTitle, ariaLabelledBy }: SourceFlyoutProps) => (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={ariaLabelledBy}>
          {panelTitle
            ? i18n.translate('xpack.customApp.sourceFlyout.titleWithPanel', {
                defaultMessage: 'Source of {panelTitle}',
                values: { panelTitle },
              })
            : i18n.translate('xpack.customApp.sourceFlyout.title', { defaultMessage: 'Source' })}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.customApp.sourceFlyout.description', {
            defaultMessage: 'The saved document this panel is made from. It is read only.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCodeBlock language="json" isCopyable paddingSize="m" fontSize="s">
        {JSON.stringify(document, null, 2)}
      </EuiCodeBlock>
    </EuiFlyoutBody>
  </>
);
