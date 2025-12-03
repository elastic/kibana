/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Attachment, TimerangeAttachment } from '@kbn/onechat-common/attachments';
import { AttachmentType } from '@kbn/onechat-common/attachments';

interface ContextServiceDeps {
  data: DataPublicPluginStart;
}

export class ContextService {
  constructor(private readonly deps: ContextServiceDeps) {}

  getContextualAttachments(): Attachment[] {
    const timeRange = this.deps.data.query.timefilter.timefilter.getAbsoluteTime();

    const timerangeAttachment: TimerangeAttachment = {
      id: 'current_timerange',
      type: AttachmentType.timeRange,
      data: {
        start: timeRange.from,
        end: timeRange.to,
        description: 'The timerange currently selected on the Kibana application',
      },
      hidden: true,
    };

    return [timerangeAttachment];
  }
}
