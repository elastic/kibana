/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getMoment } from '../../../../../common/lib/get_moment';

export class ActionStatus {
  constructor(props = {}) {
    this.id = get(props, 'id');
    this.state = get(props, 'state');
    this.isAckable = get(props, 'isAckable');
    this.lastAcknowledged = getMoment(get(props, 'lastAcknowledged'));
    this.lastThrottled = getMoment(get(props, 'lastThrottled'));
    this.lastExecution = getMoment(get(props, 'lastExecution'));
    this.lastExecutionSuccessful = get(props, 'lastExecutionSuccessful');
    this.lastExecutionReason = get(props, 'lastExecutionReason');
    this.lastSuccessfulExecution = getMoment(get(props, 'lastSuccessfulExecution'));

    if (this.lastAcknowledged) {
      this.lastAcknowledgedHumanized = this.lastAcknowledged.fromNow();
    }
    if (this.lastExecution) {
      this.lastExecutionHumanized = this.lastExecution.fromNow();
    }
    if (this.lastThrottled) {
      this.lastThrottledHumanized = this.lastThrottled.fromNow();
    }
  }

  static fromUpstreamJson(upstreamActionStatus) {
    return new ActionStatus(upstreamActionStatus);
  }
}
