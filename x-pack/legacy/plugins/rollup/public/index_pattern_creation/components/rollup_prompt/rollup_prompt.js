/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';

export const RollupPrompt = () => (
  <EuiCallOut color="warning" iconType="help" title="Beta feature">
    <p>
      Kibana&apos;s support for rollup index patterns is in beta. You might encounter issues using
      these patterns in saved searches, visualizations, and dashboards. They are not supported in
      advanced features, such as TSVB, Timelion, and Machine Learning.
    </p>
    <p>
      You can match a rollup index pattern against one rollup index and zero or more regular
      indices. A rollup index pattern has limited metrics, fields, intervals, and aggregations. A
      rollup index is limited to indices that have one job configuration, or multiple jobs with
      compatible configurations.
    </p>
  </EuiCallOut>
);
