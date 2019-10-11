/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class ManageEpicTimelineId {
  private timelineId: string | null = null;
  private version: string | null = null;

  public getTimelineId(): string | null {
    return this.timelineId;
  }

  public getTimelineVersion(): string | null {
    return this.version;
  }

  public setTimelineId(timelineId: string | null) {
    this.timelineId = timelineId;
  }

  public setTimelineVersion(version: string | null) {
    this.version = version;
  }
}
