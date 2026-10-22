/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
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
  EuiImage,
  EuiLoadingChart,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import {
  downloadFileAs,
  type ExportShareParameters,
  useShareTypeContext,
} from '@kbn/share-plugin/public';

import { API_BASE, type DashboardLayout, DRAW_MAX_BYTES, VIEW_BASE } from '../common';

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

/** A composition from the composition route, kept with the layout it was made for. */
interface Spec {
  composition: Record<string, unknown>;
  hints: Record<string, unknown>;
  layout: DashboardLayout;
}

class TooLargeError extends Error {}

const errorMessage = (e: unknown) =>
  e instanceof TooLargeError
    ? i18n.translate('xpack.isomerDashboards.flyout.tooLarge', {
        defaultMessage:
          'This dashboard is too large to print from its preview: its composition is over {size} MB.',
        values: { size: DRAW_MAX_BYTES / 1_000_000 },
      })
    : (e as { body?: { message?: string } })?.body?.message ??
      (e instanceof Error ? e.message : String(e));

/** The body gzipped where the browser can, since compositions carry their data. */
const gzipped = async (json: string): Promise<{ body: BodyInit; encoding?: string }> => {
  if (typeof CompressionStream === 'undefined') {
    return { body: json };
  }
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return { body: await new Response(stream).blob(), encoding: 'gzip' };
};

/** Draws a kept composition through the draw route, as a PNG or a PDF. */
const draw = async (
  core: CoreStart,
  { composition, hints, layout }: Spec,
  format: 'png' | 'pdf',
  title: string
): Promise<Blob> => {
  const json = JSON.stringify({ composition, hints, layout, format, title });
  if (json.length > DRAW_MAX_BYTES) {
    throw new TooLargeError();
  }
  const { body, encoding } = await gzipped(json);
  try {
    // `core.http` sends JSON's content type itself.
    const { response } = await core.http.post(`${API_BASE}/draw`, {
      body,
      ...(encoding ? { headers: { 'content-encoding': encoding } } : {}),
      asResponse: true,
      rawResponse: true,
    });
    if (!response) {
      throw new Error('The drawing failed');
    }
    return await response.blob();
  } catch (e) {
    const response = (e as { response?: Response })?.response;
    if (response?.status === 413) {
      throw new TooLargeError();
    }
    const message = await response
      ?.json()
      .then((parsed: { message?: string }) => parsed.message)
      .catch(() => undefined);
    throw message ? new Error(message) : e;
  }
};

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
  // Read once: the time range and controls can't change while the flyout is open.
  const [onScreen] = useState(() => {
    const timeRange = locatorParams?.params?.time_range;
    const controls = currentControls(locatorParams?.params?.pinned_panels);
    return { ...(timeRange ? { timeRange } : {}), ...(controls?.length ? { controls } : {}) };
  });
  const [layout, setLayout] = useState<DashboardLayout>('grid');
  const [spec, setSpec] = useState<Spec>();
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState<'preview' | 'pdf'>();
  const [error, setError] = useState<string>();
  const path = objectId ? buildPath(`${API_BASE}/{id}/composition`, { id: objectId }) : undefined;

  // The composition is made once per layout; the preview, the PDF and the composition download all use it.
  useEffect(() => {
    if (!path) {
      return;
    }
    let current = true;
    let url: string | undefined;
    setSpec(undefined);
    setPreview(undefined);
    setError(undefined);
    setBusy('preview');
    (async () => {
      const made = await core.http.post<Omit<Spec, 'layout'>>(path, {
        body: JSON.stringify({ layout, ...onScreen }),
      });
      if (!current) {
        return;
      }
      const kept = { ...made, layout };
      setSpec(kept);
      const png = await draw(core, kept, 'png', title);
      if (current) {
        url = URL.createObjectURL(png);
        setPreview(url);
      }
    })()
      .catch((e) => current && setError(errorMessage(e)))
      .finally(() => current && setBusy(undefined));
    return () => {
      current = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [core, path, layout, onScreen, title]);

  const downloadPdf = async () => {
    if (!spec) {
      return;
    }
    setBusy('pdf');
    setError(undefined);
    try {
      downloadFileAs(`${title}.pdf`, await draw(core, spec, 'pdf', title));
      closeFlyout();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(undefined);
    }
  };

  const downloadComposition = () => {
    if (spec) {
      const { composition, hints } = spec;
      downloadFileAs(`${title}.isomer.json`, {
        content: JSON.stringify({ composition, hints }),
        type: 'application/json',
      });
    }
  };

  const openMobileView = () => {
    if (!objectId) {
      return;
    }
    const query = new URLSearchParams({
      layout: 'stack',
      ...(onScreen.timeRange ?? {}),
      ...(onScreen.controls ? { controls: JSON.stringify(onScreen.controls) } : {}),
    });
    window.open(
      core.http.basePath.prepend(`${VIEW_BASE}/${encodeURIComponent(objectId)}/view?${query}`),
      '_blank',
      'noopener'
    );
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
        {(preview || busy === 'preview') && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.isomerDashboards.flyout.preview', {
                defaultMessage: 'Preview',
              })}
            >
              {preview ? (
                <EuiImage
                  src={preview}
                  alt={i18n.translate('xpack.isomerDashboards.flyout.previewAlt', {
                    defaultMessage: 'The page the PDF prints: {title}',
                    values: { title },
                  })}
                  size="fullWidth"
                  hasShadow
                  allowFullScreen
                  data-test-subj="isomerDashboardsPreview"
                />
              ) : (
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingChart size="l" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFormRow>
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
            <EuiButtonEmpty
              iconType="code"
              onClick={downloadComposition}
              isDisabled={!spec}
              data-test-subj="isomerDashboardsDownloadComposition"
            >
              {i18n.translate('xpack.isomerDashboards.flyout.downloadComposition', {
                defaultMessage: 'Download composition',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="download"
              onClick={downloadPdf}
              isLoading={busy === 'pdf'}
              isDisabled={!spec || busy !== undefined}
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

/** The share menu entry: a flyout that previews the page, then downloads it as a PDF, or opens the mobile view. */
export const isomerExportConfig = (core: CoreStart): ExportShareParameters => ({
  label: ({ openFlyout }) => (
    <EuiButtonEmpty size="s" iconType="document" onClick={openFlyout}>
      {i18n.translate('xpack.isomerDashboards.label', { defaultMessage: 'PDF (Isomer)' })}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: { size: 'm' },
  flyoutContent: ({ closeFlyout }) => <IsomerExportFlyout core={core} closeFlyout={closeFlyout} />,
});
