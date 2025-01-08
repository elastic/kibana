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

export const getScrollApiTextForConsole = (
  jobTitle: string,
  indexPattern: string,
  searchSource: ISearchSource,
  csvConfig: ClientConfigType['csv']
) => {
  const queryInfo = getQueryFromCsvJob(searchSource, csvConfig);

  // Part 1
  const scanRequest =
    `POST /${indexPattern}/_search?scroll=${csvConfig.scroll.duration}` +
    `&ignore_unavailable=true`;
  const scanBody = JSON.stringify(queryInfo.requestBody, null, '  ');
  const introText = i18n.translate(
    // intro to the content
    'xpack.reporting.reportInfoFlyout.devToolsContent.introText.scroll',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# Report title: {jobTitle}
# These are the queries used when exporting data for
# the CSV report.
#
# For reference about the Elasticsearch Scroll API, see
# https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#scroll-search-results

# The first query opens a scroll context and receive back
# the ID reference. The "scroll" value is taken from the
# "xpack.reporting.csv.scroll.duration" setting.
#
# The response will include an "_scroll_id" value, which is
# needed for the second query.
{scanRequest}
{scanBody}`,
      values: { jobTitle, scanRequest, scanBody },
    }
  );

  // Part 2
  const pagingRequest = `POST /_search/scroll`;
  const pagingBody = JSON.stringify(
    { scroll: csvConfig.scroll.duration, scroll_id: `[ID returned from latest request]` },
    null,
    '  '
  );
  const queryText = i18n.translate(
    // query with the request path and body
    'xpack.reporting.reportInfoFlyout.devToolsContent.queryText.scroll',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# The second query executes a search using the scroll ID.
# The "scroll" value comes from the
# "xpack.reporting.csv.scroll.duration" setting in
# kibana.yml.
#
# The reponse will include new a scroll ID, which might
# not be the same as the ID returned from the first query.
# When paging through the data, always use the scroll ID
# from the latest search response.
{pagingRequest}
{pagingBody}`,
      values: { pagingRequest, pagingBody },
    }
  );

  // Part 3
  const pagingText = i18n.translate(
    // info about querying further pages, and link to documentation
    'xpack.reporting.reportInfoFlyout.devToolsContent.pagingText.scroll',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# The first request retrieved the first page of search
# results. If you want to retrieve more hits, keep calling
# the search API with the scroll ID.`,
    }
  );

  // Part 4
  const clearScrollRequest = `DELETE /_search/scroll\n${JSON.stringify(
    { scroll_id: `[ID returned from latest request]` },
    null,
    '  '
  )}`;
  const closingText = i18n.translate(
    // reminder to close the point-in-time context
    'xpack.reporting.reportInfoFlyout.devToolsContent.closingText.scroll',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# Finally, release the resources held in Elasticsearch
# memory by clearing the scroll context.
{clearScrollRequest}`,
      values: { clearScrollRequest },
    }
  );

  // End
  return `${introText}\n${queryText}\n${pagingText}\n${closingText}`.trim();
};
