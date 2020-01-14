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
 * - `objectType` is optional, but helps differentiate the type of report in the job listing
 * - `title` must be explicitly passed
 * - `relativeUrls` array OR `relativeUrl` string must be passed
 */

const getSavedObjectTitle = async (objectType, savedObjectId, savedObjectsClient) => {
  const savedObject = await savedObjectsClient.get(objectType, savedObjectId);
  return savedObject.attributes.title;
};

const getSavedObjectRelativeUrl = (objectType, savedObjectId, queryString) => {
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
    return async function(
      {
        savedObjectId, // deprecating
        queryString, // deprecating
        browserTimezone,
        objectType,
        title,
        relativeUrls,
        layout,
      },
      headers,
      request
    ) {
      // input validation and deprecation logging
      if (savedObjectId) {
        if (typeof savedObjectId !== 'string') {
          throw new Error('Invalid savedObjectId (deprecated). String is expected.');
        }
        if (relativeUrls) {
          throw new Error(`savedObjectId should not be provided if relativeUrls are provided`);
        }
      } else {
        if (!relativeUrls) {
          throw new Error(`Either relativeUrls or savedObjectId must be provided`);
        }
        if (!Array.isArray(relativeUrls)) {
          throw new Error('Invalid relativeUrls. String[] is expected.');
        }
        relativeUrls.forEach(url => {
          if (typeof url !== 'string') {
            throw new Error('Invalid Relative URL in relativeUrls. String is expected.');
          }
        });
      }

      let kibanaRelativeUrls;
      if (relativeUrls) {
        kibanaRelativeUrls = relativeUrls;
      } else {
        kibanaRelativeUrls = [getSavedObjectRelativeUrl(objectType, savedObjectId, queryString)];
        logger.warning(
          `The relativeUrls have been derived from saved object parameters. ` +
            `This functionality will be removed with the next major version.`
        );
      }

      let reportTitle;
      try {
        if (title) {
          reportTitle = title;
        } else {
          if (objectType && savedObjectId) {
            reportTitle = await getSavedObjectTitle(
              objectType,
              savedObjectId,
              request.getSavedObjectsClient()
            );
            logger.warning(
              `The title has been derived from saved object parameters. This ` +
                `functionality will be removed with the next major version.`
            );
          } else {
            logger.warning(
              `A title parameter should be provided with the job generation ` +
                `request. Please use Kibana to regenerate your POST URL to have a ` +
                `title included in the PDF.`
            );
          }
        }
      } catch (err) {
        logger.error(err); // 404 for the savedObjectId, etc
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
