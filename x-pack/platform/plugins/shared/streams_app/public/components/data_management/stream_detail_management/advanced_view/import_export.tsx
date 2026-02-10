/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { Row } from './row';
import { ImportContentPackFlyout } from '../../content/import_flyout';
import { ExportContentPackFlyout } from '../../content/export_flyout';

export function ImportExportPanel({
  definition,
  refreshDefinition,
}: {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const [isExportFlyoutOpen, setIsExportFlyoutOpen] = React.useState(false);
  const [isImportFlyoutOpen, setIsImportFlyoutOpen] = React.useState(false);

  return (
    <>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate('xpack.streams.streamAdvancedView.importExportTitle', {
                defaultMessage: 'Import & export',
              })}
            </h3>
          </EuiText>
        </EuiPanel>

        <EuiPanel hasShadow={false} hasBorder={false}>
          <Row
            left={
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.streams.streamDetailView.importAndExportDescription', {
                    defaultMessage:
                      "Package and export this stream's configuration including significant events and child streams, or import a package with a guided preview.",
                  })}
                </EuiText>
              </EuiFlexItem>
            }
            right={
              <EuiFlexGroup gutterSize="m" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="importAction" onClick={() => setIsImportFlyoutOpen(true)}>
                    {i18n.translate('xpack.streams.streamDetailView.importButtonLabel', {
                      defaultMessage: 'Import',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconType="exportAction"
                    fill
                    onClick={() => setIsExportFlyoutOpen(true)}
                  >
                    {i18n.translate('xpack.streams.streamDetailView.exportButtonLabel', {
                      defaultMessage: 'Export',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiPanel>
      </EuiPanel>

      {isExportFlyoutOpen && (
        <ExportContentPackFlyout
          onClose={() => setIsExportFlyoutOpen(false)}
          definition={definition}
          onExport={() => setIsExportFlyoutOpen(false)}
        />
      )}

      {isImportFlyoutOpen && (
        <ImportContentPackFlyout
          onClose={() => setIsImportFlyoutOpen(false)}
          definition={definition}
          onImport={() => {
            setIsImportFlyoutOpen(false);
            refreshDefinition();
          }}
        />
      )}
    </>
  );
}
