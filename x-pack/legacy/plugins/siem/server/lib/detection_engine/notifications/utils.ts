/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getNotificationResultsLink = ({
  id,
  from,
  to,
}: {
  id: string;
  from: string;
  to: string;
}) =>
  `http://localhost:5601/app/siem#/detections/rules/id/${id}?timerange=(global:(linkTo:!(timeline),timerange:(from:${from},kind:absolute,to:${to})),timeline:(linkTo:!(global),timerange:(from:${from},kind:absolute,to:${to})))`;
