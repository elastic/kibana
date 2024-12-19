/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchSource } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { getQueryFromCsvJob } from '@kbn/reporting-export-types-csv-common';
import type { ClientConfigType } from '@kbn/reporting-public';

export const getPitApiTextForConsole = (
  jobTitle: string,
  indexPattern: string,
  searchSource: ISearchSource,
  csvConfig: ClientConfigType['csv']
) => {
  const examplePitId = i18n.translate(
    'xpack.reporting.reportInfoFlyout.devToolsContent.examplePitId',
    {
      defaultMessage: `[ID returned from first request]`,
      description: `This gets used in place of an ID string that is sent in a request body.`,
    }
  );
  const queryInfo = getQueryFromCsvJob(searchSource, csvConfig, examplePitId);

  // Part 1
  const pitRequest =
    `POST /${indexPattern}/_pit?keep_alive=${csvConfig.scroll.duration}` +
    `&ignore_unavailable=true`;
  const queryRequest = `POST /_search`;
  const closePitRequest = `DELETE /_pit\n${JSON.stringify(
    { id: `[ID returned from latest request]` },
    null,
    '  '
  )}`;
  const introText = i18n.translate(
    // intro to the content
    'xpack.reporting.reportInfoFlyout.devToolsContent.introText.pit',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# Report title: {jobTitle}
# These are the queries used when exporting data for
# the CSV report.
#
# For reference about the Elasticsearch Point-In-Time
# API, see
# https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html

# The first query opens a Point-In-Time (PIT) context
# and receive back the ID reference. The "keep_alive"
# value is taken from the
# "xpack.reporting.csv.scroll.duration" setting.
#
# The response will include an "id" value, which is
# needed for the second query.
{pitRequest}`,
      values: {
        jobTitle,
        pitRequest,
      },
    }
  );

  // Part 2
  const { requestBody } = queryInfo;
  const queryAsString = JSON.stringify(requestBody, null, '  ');
  const queryText = i18n.translate(
    // query with the request path and body
    'xpack.reporting.reportInfoFlyout.devToolsContent.queryText.pit',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# The second query executes a search using the PIT ID.
# The "keep_alive" and "size" values come from the
# "xpack.reporting.csv.scroll.duration" and
# "xpack.reporting.csv.scroll.size" settings in
# kibana.yml.
#
# The reponse will include new a PIT ID, which might not
# be the same as the ID returned from the first query.
# When paging through the data, always use the PIT ID from
# the latest search response. See
# https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html
{queryRequest}
{queryAsString}`,
      values: { queryRequest, queryAsString },
    }
  );

  // Part 3
  const pagingText = i18n.translate(
    // info about querying further pages, and link to documentation
    'xpack.reporting.reportInfoFlyout.devToolsContent.pagingText.pit',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# The first request retrieved the first page of search
# results. If you want to retrieve more hits, use the
# latest PIT ID with search_after.`,
    }
  );

  // Part 4
  const closingText = i18n.translate(
    // reminder to close the point-in-time context
    'xpack.reporting.reportInfoFlyout.devToolsContent.closingText.pit',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# Finally, release the resources held in Elasticsearch
# memory by closing the PIT.
{closePitRequest}`,
      values: { closePitRequest },
    }
  );

  // End
  return `${introText}\n${queryText}\n${pagingText}\n${closingText}`.trim();
};
