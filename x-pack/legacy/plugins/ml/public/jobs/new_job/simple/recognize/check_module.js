/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { mlJobService } from '../../../../services/job_service';
import { ml } from '../../../../services/ml_api_service';
import { toastNotifications } from 'ui/notify';


// Checks whether the jobs in a data recognizer module have been created.
// Redirects to the Anomaly Explorer to view the jobs if they have been created,
// or the recognizer job wizard for the module if not.
export function checkViewOrCreateJobs(Private, $route, kbnBaseUrl, kbnUrl) {

  return new Promise((resolve, reject) => {
    const moduleId = $route.current.params.id;
    const indexPatternId = $route.current.params.index;

    // Load the module, and check if the job(s) in the module have been created.
    // If so, load the jobs in the Anomaly Explorer.
    // Otherwise open the data recognizer wizard for the module.
    // Always want to call reject() so as not to load original page.
    ml.dataRecognizerModuleJobsExist({ moduleId })
      .then((resp) => {
        const basePath = `${chrome.getBasePath()}/app/`;

        if (resp.jobsExist === true) {
          const resultsPageUrl = mlJobService.createResultsUrlForJobs(resp.jobs, 'explorer');
          window.location.href = `${basePath}${resultsPageUrl}`;
          reject();
        } else {
          window.location.href = `${basePath}ml#/jobs/new_job/simple/recognize?id=${moduleId}&index=${indexPatternId}`;
          reject();
        }

      })
      .catch((err) => {
        console.log(`Error checking whether jobs in module ${moduleId} exists`, err);
        toastNotifications.addWarning({
          title: i18n.translate('xpack.ml.newJob.simple.recognize.moduleCheckJobsExistWarningTitle', {
            defaultMessage: 'Error checking module {moduleId}',
            values: { moduleId }
          }),
          text: i18n.translate('xpack.ml.newJob.simple.recognize.moduleCheckJobsExistWarningDescription', {
            defaultMessage: 'An error occurred trying to check whether the jobs in the module have been created.',
          })
        });


        kbnUrl.redirect(`/jobs`);
        reject();
      });
  });
}
