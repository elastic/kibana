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
import { downloadWorkpad } from '../../../lib/download_workpad';
import { WorkpadExport as Component, Props as ComponentProps } from './workpad_export';
import { getPdfUrl, createPdf } from './utils';
import { CanvasWorkpad } from '../../../../types';

const mapStateToProps = (state: any) => ({
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
  withProps(
    ({ workpad, pageCount, enabled }: Props): ComponentProps => ({
      enabled,
      getExportUrl: type => {
        if (type === 'pdf') {
          return getAbsoluteUrl(getPdfUrl(workpad, { pageCount }));
        }

        throw new Error(`Unknown export type: ${type}`);
      },
      onCopy: type => {
        switch (type) {
          case 'pdf':
            notify.info('The PDF generation URL was copied to your clipboard.');
            break;
          case 'reportingConfig':
            notify.info(`Copied reporting configuration to clipboard`);
            break;
          default:
            throw new Error(`Unknown export type: ${type}`);
        }
      },
      onExport: type => {
        switch (type) {
          case 'pdf':
            return createPdf(workpad, { pageCount })
              .then(({ data }: { data: { job: { id: string } } }) => {
                notify.info('Exporting PDF. You can track the progress in Management.', {
                  title: `PDF export of workpad '${workpad.name}'`,
                });

                // register the job so a completion notification shows up when it's ready
                jobCompletionNotifications.add(data.job.id);
              })
              .catch((err: Error) => {
                notify.error(err, { title: `Failed to create PDF for '${workpad.name}'` });
              });
          case 'json':
            downloadWorkpad(workpad.id);
            break;
          default:
            throw new Error(`Unknown export type: ${type}`);
        }
      },
    })
  )
)(Component);
