/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uriEncode } from '../lib/uri_encode';

/*
 * TODO: Kibana 8.0:
 * Remove support for parsing Saved Object details from objectType / savedObjectId
 * Including support for determining the Report title from objectType / savedObjectId
 *
 * - `objectType` must still be passed to differentiate the type of report in a job listing
 * - `title` must be explicitly passed
 *
 */

const getSavedObjectTitle = async (objectType, savedObjectId, savedObjectsClient) => {
  if (!savedObjectId) {
    throw new Error(
      `A savedObjectId parameter is required for legacy compatibility to parse parameters into a saved object URL`
    );
  }

  const savedObject = await savedObjectsClient.get(objectType, savedObjectId);
  return savedObject.attributes.title;
};

const getSavedObjectRelativeUrl = (objectType, savedObjectId, queryString) => {
  if (!savedObjectId) {
    throw new Error('savedObjectId is required to determine the savedObject relativeUrl');
  }

  const appPrefixes = {
    dashboard: '/dashboard/',
    visualization: '/visualize/edit/',
    search: '/discover/',
  };

  const appPrefix = appPrefixes[objectType];
  if (!appPrefix) throw new Error('Unexpected app type: ' + objectType);

  const hash = appPrefix + uriEncode.string(savedObjectId, true);

  return `/app/kibana#${hash}?${queryString || ''}`;
};

export function compatibilityShimFactory(server, logger) {
  return function compatibilityShimFactory(createJobFn) {
    return async function (
      {
        savedObjectId, // deprecating
        queryString, // deprecating
        browserTimezone,
        objectType,
        title,
        relativeUrls,
        layout
      },
      headers,
      request
    ) {
      if (!objectType) {
        throw new Error(`objectType must be provided`);
      }
      if (savedObjectId && relativeUrls) {
        throw new Error(`savedObjectId should not be provided if relativeUrls are provided`);
      }
      if (!savedObjectId && !relativeUrls) {
        throw new Error(`either relativeUrls or savedObjectId must be provided`);
      }

      let kibanaRelativeUrls;
      if (!relativeUrls) {
        logger.warning(
          `Kibana Reporting will soon no longer work by parsing a Saved Object ` +
            `type and ID into a Kibana URL. Please use Kibana to regenerate the ` +
            `POST URL to get a report generation URL that will work with future ` +
            `versions of Kibana.`
        );
        kibanaRelativeUrls = [getSavedObjectRelativeUrl(objectType, savedObjectId, queryString)];
        logger.warning(
          `The relativeUrls have been derived from saved object parameters. ` +
            `This functionality will be removed with the next major version.`
        );
      } else {
        kibanaRelativeUrls = relativeUrls;
      }

      let reportTitle = title;
      try {
        if (!reportTitle) {
          logger.warning(
            `A title parameter should be provided with the job generation ` +
              `request. Please use Kibana to regenerate your POST URL to have a ` +
              `title included in the PDF.`
          );
          if (savedObjectId) {
            reportTitle = await getSavedObjectTitle(
              objectType,
              savedObjectId,
              request.getSavedObjectsClient()
            );
            logger.warning(
              `The title has been derived from saved object parameters. This ` +
                `functionality will be removed with the next major version.`
            );
          }

        }
      } catch (err) {
        logger.error(err); // 404, etc
        throw err;
      }

      const transformedJobParams = {
        objectType,
        title: reportTitle,
        relativeUrls: kibanaRelativeUrls,
        browserTimezone,
        layout,
      };

      return await createJobFn(transformedJobParams, headers, request);
    };
  };
}
