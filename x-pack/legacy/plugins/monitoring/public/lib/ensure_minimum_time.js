/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/**
 * When you make an async request, typically you want to show the user a spinner while they wait.
 * However, if the request takes less than 300 ms, the spinner will flicker in the UI and the user
 * won't have time to register it as a spinner. This function ensures the spinner (or whatever
 * you're showing the user) displays for at least 300 ms, even if the request completes before then.
 */

export const DEFAULT_MINIMUM_TIME_MS = 300;

export async function ensureMinimumTime(promiseOrPromises, minimumTimeMs = DEFAULT_MINIMUM_TIME_MS) {
  let returnValue;

  // https://kibana-ci.elastic.co/job/elastic+kibana+6.x+multijob-intake/128/console
  // We're having periodic failures around the timing here. I'm not exactly sure
  // why it's not consistent but I'm going to add some buffer space here to
  // prevent these random failures
  const bufferedMinimumTimeMs = minimumTimeMs + 5;

  // Block on the async action and start the clock.
  const asyncActionStartTime = new Date().getTime();
  if (Array.isArray(promiseOrPromises)) {
    returnValue = await Promise.all(promiseOrPromises);
  } else {
    returnValue = await promiseOrPromises;
  }

  // Measure how long the async action took to complete.
  const asyncActionCompletionTime = new Date().getTime();
  const asyncActionDuration = asyncActionCompletionTime - asyncActionStartTime;

  // Wait longer if the async action completed too quickly.
  if (asyncActionDuration < bufferedMinimumTimeMs) {
    const additionalWaitingTime = bufferedMinimumTimeMs - (asyncActionCompletionTime - asyncActionStartTime);
    await new Promise(resolve => setTimeout(resolve, additionalWaitingTime));
  }

  return returnValue;
}
