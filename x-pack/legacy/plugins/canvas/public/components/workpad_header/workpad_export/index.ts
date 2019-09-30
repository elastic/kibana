/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { jobCompletionNotifications } from '../../../../../reporting/public/lib/job_completion_notifications';
// @ts-ignore Untyped local
import {
  getWorkpad,
  getPages,
  getRenderedWorkpad,
  getRenderedWorkpadExpressions,
} from '../../../state/selectors/workpad';
// @ts-ignore Untyped local
import { getReportingBrowserType } from '../../../state/selectors/app';
// @ts-ignore Untyped local
import { notify } from '../../../lib/notify';
import { getWindow } from '../../../lib/get_window';
// @ts-ignore Untyped local
import {
  downloadWorkpad,
  downloadRenderedWorkpad,
  downloadEmbedRuntime,
  downloadZippedEmbed,
  // @ts-ignore Untyped local
} from '../../../lib/download_workpad';
import { WorkpadExport as Component, Props as ComponentProps } from './workpad_export';
import { getPdfUrl, createPdf } from './utils';
import { State, CanvasWorkpad } from '../../../../types';
import { CanvasRenderedWorkpad } from '../../../../shareable_runtime/types';
// @ts-ignore Untyped local.
import { fetch, arrayBufferFetch } from '../../../../common/lib/fetch';
import { API_ROUTE_SHAREABLE_ZIP } from '../../../../common/lib/constants';
import { renderFunctionNames } from '../../../../shareable_runtime/supported_renderers';

import { ComponentStrings } from '../../../../i18n';
const { WorkpadHeaderWorkpadExport: strings } = ComponentStrings;

const getUnsupportedRenderers = (state: State) => {
  const renderers: string[] = [];
  const expressions = getRenderedWorkpadExpressions(state);
  expressions.forEach(expression => {
    if (!renderFunctionNames.includes(expression)) {
      renderers.push(expression);
    }
  });

  return renderers;
};

const mapStateToProps = (state: State) => ({
  workpad: getWorkpad(state),
  unsupportedRenderers: getUnsupportedRenderers(state),
  renderedWorkpad: getRenderedWorkpad(state),
  pageCount: getPages(state).length,
  enabled: getReportingBrowserType(state) === 'chromium',
});

const getAbsoluteUrl = (path: string) => {
  const { location } = getWindow();

  if (!location) {
    return path;
  } // fallback for mocked window object

  const { protocol, hostname, port } = location;
  return `${protocol}//${hostname}:${port}${path}`;
};

interface Props {
  workpad: CanvasWorkpad;
  renderedWorkpad: CanvasRenderedWorkpad;
  pageCount: number;
  enabled: boolean;
  unsupportedRenderers: string[];
}

export const WorkpadExport = compose<ComponentProps, {}>(
  connect(mapStateToProps),
  withProps(
    ({
      workpad,
      pageCount,
      enabled,
      renderedWorkpad,
      unsupportedRenderers,
    }: Props): ComponentProps => ({
      unsupportedRenderers,
      enabled,
      getExportUrl: type => {
        if (type === 'pdf') {
          const { createPdfUri } = getPdfUrl(workpad, { pageCount });
          return getAbsoluteUrl(createPdfUri);
        }

        throw new Error(strings.getUnknownExportErrorMessage(type));
      },
      onCopy: type => {
        switch (type) {
          case 'pdf':
            notify.info(strings.getCopyPDFMessage());
            break;
          case 'reportingConfig':
            notify.info(strings.getCopyReportingConfigMessage());
            break;
          case 'share':
            notify.info(strings.getCopyShareConfigMessage());
            break;
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
      onExport: type => {
        switch (type) {
          case 'pdf':
            return createPdf(workpad, { pageCount })
              .then(({ data }: { data: { job: { id: string } } }) => {
                notify.info(strings.getExportPDFMessage(), {
                  title: strings.getExportPDFTitle(workpad.name),
                });

                // register the job so a completion notification shows up when it's ready
                jobCompletionNotifications.add(data.job.id);
              })
              .catch((err: Error) => {
                notify.error(err, { title: strings.getExportPDFErrorTitle(workpad.name) });
              });
          case 'json':
            downloadWorkpad(workpad.id);
            return;
          case 'share':
            downloadRenderedWorkpad(renderedWorkpad);
            return;
          case 'shareRuntime':
            downloadEmbedRuntime();
            return;
          case 'shareZip':
            const basePath = chrome.getBasePath();
            arrayBufferFetch
              .post(`${basePath}${API_ROUTE_SHAREABLE_ZIP}`, JSON.stringify(renderedWorkpad))
              .then(blob => downloadZippedEmbed(blob.data))
              .catch((err: Error) => {
                notify.error(err, { title: strings.getShareableZipErrorTitle(workpad.name) });
              });
            return;
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
    })
  )
)(Component);
