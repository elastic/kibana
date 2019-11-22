/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';

import { Annotation } from '../../../../../common/types/annotations';
import { MlJob } from '../../../../../common/types/jobs';

interface Props {
  selectedJob: MlJob;
}

interface State {
  annotation: Annotation | null;
}

export interface TimeseriesChart extends React.Component<Props, State> {
  focusXScale: d3.scale.Ordinal<{}, number>;
}
