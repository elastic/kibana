/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random, times } from 'lodash';
import moment from 'moment';
import { v4 } from 'uuid';
import { Doc } from '../types';

const MIN_DURRATION = 300 * 1000; // 5m
const MAX_DURRATION = 12 * 60 * 60 * 1000; // 12 hours
let projectIds: Array<[string, number]> = [];

export function addEphemeralProjectId(totalProjectIds: number, events: Doc[]) {
  if (totalProjectIds === 0) {
    return events;
  }

  const now = (events[0] && moment(events[0]['@timestamp']).valueOf()) || Date.now();
  const workingIds = projectIds.filter(([_id, expirationDate]) => expirationDate > now);
  const numberOfIdsToCreate = totalProjectIds - workingIds.length;

  if (numberOfIdsToCreate > 0) {
    times(numberOfIdsToCreate).forEach(() => {
      const projectId = v4();
      const expiration = now + random(MIN_DURRATION, MAX_DURRATION);
      const project: [string, number] = [projectId, expiration];
      workingIds.push(project);
    });
  }

  projectIds = workingIds;

  return projectIds.flatMap(([id]) => {
    return events.map((event) => {
      const newLabels = event.labels ? { ...event.labels, projectId: id } : { projectId: id };
      return { ...event, labels: newLabels };
    });
  });
}
