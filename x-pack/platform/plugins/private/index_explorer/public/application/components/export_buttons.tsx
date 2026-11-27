/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ExportFormat } from '../../../common/types';
import type { DownloadedFile } from '../api';
import { getErrorMessage, saveFile } from '../lib/download';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

const FORMATS: readonly ExportFormat[] = ['csv', 'json'];

/** CSV and JSON download buttons; `onExport` fetches the file for the requested format. */
export function ExportButtons({
  onExport,
  disabled,
}: {
  onExport: (format: ExportFormat) => Promise<DownloadedFile>;
  disabled?: boolean;
}) {
  const { core } = useServices();
  const [pending, setPending] = useState<ExportFormat | undefined>();

  async function handleExport(format: ExportFormat) {
    setPending(format);
    try {
      saveFile(await onExport(format));
    } catch (error) {
      core.notifications.toasts.addDanger({
        title: i18nTexts.exportFailed,
        text: getErrorMessage(error),
      });
    } finally {
      setPending(undefined);
    }
  }

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} wrap>
      {FORMATS.map((format) => (
        <EuiFlexItem grow={false} key={format}>
          <EuiButtonEmpty
            size="s"
            iconType="download"
            isLoading={pending === format}
            isDisabled={disabled || pending !== undefined}
            onClick={() => handleExport(format)}
            data-test-subj={`indexExplorerExport-${format}`}
          >
            {i18nTexts.exportAs(format)}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
