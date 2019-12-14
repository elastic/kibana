/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

import { ml } from 'plugins/ml/services/ml_api_service';
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar';

const msgs = mlMessageBarService;

class CalendarService {
  constructor() {
    this.calendars = [];
    // list of calendar ids per job id
    this.jobCalendars = {};
    // list of calendar ids per group id
    this.groupCalendars = {};
  }

  loadCalendars(jobs) {
    return new Promise((resolve, reject) => {
      let calendars = [];
      jobs.forEach(j => {
        this.jobCalendars[j.job_id] = [];
      });
      const groups = {};
      mlJobService.getJobGroups().forEach(g => {
        groups[g.id] = g;
      });

      ml.calendars()
        .then(resp => {
          calendars = resp;
          // loop through calendars and their job_ids and create jobCalendars
          // if a group is found, expand it out to its member jobs
          calendars.forEach(cal => {
            cal.job_ids.forEach(id => {
              let isGroup = false;
              // the job_id could be either a job id or a group id
              if (this.jobCalendars[id] !== undefined) {
                this.jobCalendars[id].push(cal.calendar_id);
              } else if (groups[id] !== undefined) {
                isGroup = true;
                // expand out the group into its jobs and add each job
                groups[id].jobs.forEach(j => {
                  this.jobCalendars[j.job_id].push(cal.calendar_id);
                });
              } else {
                // not a known job or a known group. assume it's a unused group
                isGroup = true;
              }

              if (isGroup) {
                // keep track of calendars per group
                if (this.groupCalendars[id] === undefined) {
                  this.groupCalendars[id] = [cal.calendar_id];
                } else {
                  this.groupCalendars[id].push(cal.calendar_id);
                }
              }
            });
          });

          // deduplicate as group expansion may have added dupes.
          _.each(this.jobCalendars, (cal, id) => {
            this.jobCalendars[id] = _.uniq(cal);
          });

          this.calendars = calendars;
          resolve({ calendars });
        })
        .catch(err => {
          msgs.error(
            i18n.translate(
              'xpack.ml.calendarService.calendarsListCouldNotBeRetrievedErrorMessage',
              {
                defaultMessage: 'Calendars list could not be retrieved',
              }
            )
          );
          msgs.error('', err);
          reject({ calendars, err });
        });
    });
  }

  // get the list of calendar groups
  getCalendarGroups() {
    return Object.keys(this.groupCalendars).map(id => ({ id }));
  }
}

export const mlCalendarService = new CalendarService();
