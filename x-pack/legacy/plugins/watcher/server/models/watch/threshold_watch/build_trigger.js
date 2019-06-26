/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
watch.trigger.schedule
 */
function buildSchedule({ triggerIntervalSize, triggerIntervalUnit }) {
  return {
    interval: `${triggerIntervalSize}${triggerIntervalUnit}`
  };
}

export function buildTrigger(watch) {
  return {
    schedule: buildSchedule(watch)
  };
}
