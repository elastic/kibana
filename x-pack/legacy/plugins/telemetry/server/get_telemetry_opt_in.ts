/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function getTelemetryOptIn(request: any) {
  const isRequestingApplication = request.path.startsWith('/app');

  // Prevent interstitial screens (such as the space selector) from prompting for telemetry
  if (!isRequestingApplication) {
    return false;
  }

  const savedObjectsClient = request.getSavedObjectsClient();

  try {
    const { attributes } = await savedObjectsClient.get('telemetry', 'telemetry');
    return attributes.enabled;
  } catch (error) {
    if (savedObjectsClient.errors.isNotFoundError(error)) {
      return null;
    }

    // if we aren't allowed to get the telemetry document, we can assume that we won't
    // be able to opt into telemetry either, so we're returning `false` here instead of null
    if (savedObjectsClient.errors.isForbiddenError(error)) {
      return false;
    }

    throw error;
  }
}
