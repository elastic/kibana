/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint import/no-unresolved: 1 */
// TODO: remove eslint rule when updating to use the linked kibana resolve package
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { jobCompletionNotifications } from '../../../../../reporting/public/lib/job_completion_notifications';
import { getWorkpad, getPages } from '../../../state/selectors/workpad';
import { getReportingBrowserType } from '../../../state/selectors/app';
import { notify } from '../../../lib/notify';
import { getWindow } from '../../../lib/get_window';
import { downloadWorkpad } from '../../../lib/download_workpad';
import { WorkpadExport as Component } from './workpad_export';
import { getPdfUrl, createPdf } from './utils';

const mapStateToProps = state => ({
  workpad: getWorkpad(state),
  pageCount: getPages(state).length,
  enabled: getReportingBrowserType(state) === 'chromium',
});

const getAbsoluteUrl = path => {
  const { location } = getWindow();
  if (!location) {
    return path;
  } // fallback for mocked window object

  const { protocol, hostname, port } = location;
  return `${protocol}//${hostname}:${port}${path}`;
};

export const WorkpadExport = compose(
  connect(mapStateToProps),
  withProps(({ workpad, pageCount }) => ({
    getExportUrl: type => {
      if (type === 'pdf') {
        return getAbsoluteUrl(getPdfUrl(workpad, { pageCount }));
      }

      throw new Error(`Unknown export type: ${type}`);
    },
    onCopy: type => {
      switch (type) {
        case 'pdf':
          return notify.info('The PDF generation URL was copied to your clipboard.');
        case 'reportingConfig':
          return notify.info(`Copied reporting configuration to clipboard`);
      }
      throw new Error(`Unknown export type: ${type}`);
    },
    onExport: type => {
      switch (type) {
        case 'pdf':
          return createPdf(workpad, { pageCount })
            .then(({ data }) => {
              notify.info('Exporting PDF. You can track the progress in Management.', {
                title: `PDF export of workpad '${workpad.name}'`,
              });

              // register the job so a completion notification shows up when it's ready
              jobCompletionNotifications.add(data.job.id);
            })
            .catch(err => {
              notify.error(err, { title: `Failed to create PDF for '${workpad.name}'` });
            });
        case 'json':
          return downloadWorkpad(workpad.id);
        default:
          throw new Error(`Unknown export type: ${type}`);
      }
    },
  }))
)(Component);
