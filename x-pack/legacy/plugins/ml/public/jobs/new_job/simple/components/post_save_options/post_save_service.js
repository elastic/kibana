/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { mlJobService } from 'plugins/ml/services/job_service';
import { i18n } from '@kbn/i18n';
import { mlCreateWatchService } from 'plugins/ml/jobs/new_job/simple/components/watcher/create_watch_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';

const msgs = mlMessageBarService;

class PostSaveService {
  constructor() {
    this.STATUS = {
      SAVE_FAILED: -1,
      SAVING: 0,
      SAVED: 1,
    };

    this.status = {
      realtimeJob: null,
      watch: null
    };
    mlCreateWatchService.status = this.status;

    this.externalCreateWatch;
  }

  startRealtimeJob(jobId) {
    return new Promise((resolve, reject) => {
      this.status.realtimeJob = this.STATUS.SAVING;

      const datafeedId = mlJobService.getDatafeedId(jobId);

      mlJobService.openJob(jobId)
        .catch(() => {})
        .then(() => {
          mlJobService.startDatafeed(datafeedId, jobId, 0, undefined)
            .then(() => {
              this.status.realtimeJob = this.STATUS.SAVED;
              resolve();
            }).catch((resp) => {
              msgs.error(
                i18n.translate('xpack.ml.newJob.simple.postSaveOptions.couldNotStartDatafeedErrorMessage', {
                  defaultMessage: 'Could not start datafeed:'
                }), resp);
              this.status.realtimeJob = this.STATUS.SAVE_FAILED;
              reject();
            });
        });

    });
  }

  apply(jobId, runInRealtime, createWatch) {
    return new Promise((resolve) => {
      if (runInRealtime) {
        this.startRealtimeJob(jobId, i18n)
          .then(() => {
            if (createWatch) {
              mlCreateWatchService.createNewWatch(jobId)
                .catch(() => {})
                .then(() => {
                  resolve();
                });
            } else {
              resolve();
            }
          });
      } else {
        resolve();
      }
    });
  }
}

export const postSaveService =  new PostSaveService();
