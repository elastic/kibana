/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import {
  downloadFileAs,
  type ExportShareParameters,
  useShareTypeContext,
} from '@kbn/share-plugin/public';

import { API_BASE, type DashboardLayout } from '../common';

interface PinnedPanel {
  id?: string;
  uid?: string;
  type: string;
  config?: Record<string, unknown>;
}

interface SharingData {
  title?: string;
  locatorParams?: {
    params?: { time_range?: { from: string; to: string }; pinned_panels?: PinnedPanel[] };
  };
}

/** The controls on screen, which the dashboard's locator carries once they differ from the saved ones. */
const currentControls = (pinned: PinnedPanel[] | undefined) =>
  pinned
    ?.filter(({ type }) => type.endsWith('_control'))
    .flatMap(({ id, uid, type, config }) =>
      id ?? uid ? [{ id: (id ?? uid)!, type, config: config ?? {} }] : []
    );

const LAYOUTS = [
  {
    id: 'grid',
    label: i18n.translate('xpack.isomerDashboards.layout.grid', {
      defaultMessage: 'Dashboard grid',
    }),
  },
  {
    id: 'stack',
    label: i18n.translate('xpack.isomerDashboards.layout.stack', { defaultMessage: 'Mobile' }),
  },
];

const IsomerExportFlyout = ({
  core,
  closeFlyout,
}: {
  core: CoreStart;
  closeFlyout: () => void;
}) => {
  const { objectId, sharingData, isDirty } = useShareTypeContext(
    'integration',
    'exportDerivatives'
  );
  const { title = 'dashboard', locatorParams } = sharingData as unknown as SharingData;
  const timeRange = locatorParams?.params?.time_range;
  const controls = currentControls(locatorParams?.params?.pinned_panels);
  const [layout, setLayout] = useState<DashboardLayout>('grid');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const path = objectId ? `${API_BASE}/${encodeURIComponent(objectId)}` : undefined;

  const download = async () => {
    if (!path) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const { response } = await core.http.post(`${path}/pdf`, {
        body: JSON.stringify({
          layout,
          ...(timeRange ? { timeRange } : {}),
          ...(controls?.length ? { controls } : {}),
        }),
        asResponse: true,
        rawResponse: true,
      });
      if (!response?.ok) {
        throw new Error((await response?.text()) ?? 'The export failed');
      }
      downloadFileAs(`${title}.pdf`, await response.blob());
      closeFlyout();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const openMobileView = () => {
    if (!path) {
      return;
    }
    const query = new URLSearchParams({
      layout: 'stack',
      ...(timeRange ?? {}),
      ...(controls?.length ? { controls: JSON.stringify(controls) } : {}),
    });
    window.open(core.http.basePath.prepend(`${path}/view?${query}`), '_blank', 'noopener');
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.isomerDashboards.flyout.title', {
              defaultMessage: 'Export with Isomer',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.isomerDashboards.flyout.description', {
              defaultMessage:
                'Draws the saved dashboard on the server with Isomer, with the time range and controls on screen. Panels Isomer can’t draw yet show a placeholder.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {isDirty && (
          <>
            <KbnWarningCallout
              size="s"
              title={i18n.translate('xpack.isomerDashboards.flyout.unsavedChanges', {
                defaultMessage:
                  'Unsaved changes won’t be printed. The export uses the saved dashboard, with the time range and controls on screen.',
              })}
            />
            <EuiSpacer size="m" />
          </>
        )}
        {objectId ? (
          <EuiFormRow
            label={i18n.translate('xpack.isomerDashboards.flyout.layout', {
              defaultMessage: 'Layout',
            })}
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.isomerDashboards.flyout.layout', {
                defaultMessage: 'Layout',
              })}
              options={LAYOUTS}
              idSelected={layout}
              onChange={(id) => setLayout(id as DashboardLayout)}
              buttonSize="compressed"
            />
          </EuiFormRow>
        ) : (
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.isomerDashboards.flyout.unsaved', {
              defaultMessage: 'Save the dashboard to export it.',
            })}
          />
        )}
        {error && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout size="s" title={error} />
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="mobile"
              onClick={openMobileView}
              isDisabled={!path}
              data-test-subj="isomerDashboardsOpenMobileView"
            >
              {i18n.translate('xpack.isomerDashboards.flyout.mobile', {
                defaultMessage: 'Open mobile view',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="download"
              onClick={download}
              isLoading={busy}
              isDisabled={!path}
              data-test-subj="isomerDashboardsDownloadPdf"
            >
              {i18n.translate('xpack.isomerDashboards.flyout.download', {
                defaultMessage: 'Download PDF',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

/** The share menu entry: a flyout that downloads the PDF or opens the mobile view. */
export const isomerExportConfig = (core: CoreStart): ExportShareParameters => ({
  label: ({ openFlyout }) => (
    <EuiButtonEmpty size="s" iconType="document" onClick={openFlyout}>
      {i18n.translate('xpack.isomerDashboards.label', { defaultMessage: 'PDF (Isomer)' })}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: { size: 's' },
  flyoutContent: ({ closeFlyout }) => <IsomerExportFlyout core={core} closeFlyout={closeFlyout} />,
});
