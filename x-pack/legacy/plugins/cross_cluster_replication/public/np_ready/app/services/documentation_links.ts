/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let esBase: string;

export const setDocLinks = ({
  DOC_LINK_VERSION,
  ELASTIC_WEBSITE_URL,
}: {
  ELASTIC_WEBSITE_URL: string;
  DOC_LINK_VERSION: string;
}) => {
  esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
};

export const getAutoFollowPatternUrl = () => `${esBase}/ccr-put-auto-follow-pattern.html`;
export const getFollowerIndexUrl = () => `${esBase}/ccr-put-follow.html`;
export const getByteUnitsUrl = () => `${esBase}/common-options.html#byte-units`;
export const getTimeUnitsUrl = () => `${esBase}/common-options.html#time-units`;
