/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { jobCompletionNotifications } from '../../../../../reporting/public/lib/job_completion_notifications';
// @ts-ignore Untyped local
import { getWorkpad, getPages } from '../../../state/selectors/workpad';
// @ts-ignore Untyped local
import { getReportingBrowserType } from '../../../state/selectors/app';
// @ts-ignore Untyped local
import { notify } from '../../../lib/notify';
import { getWindow } from '../../../lib/get_window';
// @ts-ignore Untyped local
import {
  downloadWorkpad,
  // @ts-ignore Untyped local
} from '../../../lib/download_workpad';
import { WorkpadExport as Component, Props as ComponentProps } from './workpad_export';
import { getPdfUrl, createPdf } from './utils';
import { State, CanvasWorkpad } from '../../../../types';
// @ts-ignore Untyped local.
import { fetch, arrayBufferFetch } from '../../../../common/lib/fetch';
import { withKibana } from '../../../../../../../../src/plugins/kibana_react/public/';
import { WithKibanaProps } from '../../../index';

import { ComponentStrings } from '../../../../i18n';

const { WorkpadHeaderWorkpadExport: strings } = ComponentStrings;

const mapStateToProps = (state: State) => ({
  workpad: getWorkpad(state),
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
  pageCount: number;
  enabled: boolean;
}

export const WorkpadExport = compose<ComponentProps, {}>(
  connect(mapStateToProps),
  withKibana,
  withProps(
    ({ workpad, pageCount, enabled, kibana }: Props & WithKibanaProps): ComponentProps => ({
      enabled,
      getExportUrl: type => {
        if (type === 'pdf') {
          const pdfUrl = getPdfUrl(workpad, { pageCount }, kibana.services.http.basePath.prepend);
          return getAbsoluteUrl(pdfUrl);
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
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
      onExport: type => {
        switch (type) {
          case 'pdf':
            return createPdf(workpad, { pageCount }, kibana.services.http.basePath.prepend)
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
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
    })
  )
)(Component);
