/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import type {
  Attachment,
  ApplicationContextAttachment,
  TimerangeAttachment,
} from '@kbn/onechat-common/attachments';
import { AttachmentType } from '@kbn/onechat-common/attachments';

interface ContextServiceDeps {
  application: ApplicationStart;
  data: DataPublicPluginStart;
}

export class ContextService {
  private currentLocation: string = '';
  private currentAppId: string | undefined;

  constructor(private readonly deps: ContextServiceDeps) {
    deps.application.currentLocation$.subscribe((location) => {
      this.currentLocation = location;
    });
    deps.application.currentAppId$.subscribe((appId) => {
      this.currentAppId = appId;
    });
  }

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

    const appContext: ApplicationContextAttachment = {
      id: 'kibana_context',
      type: AttachmentType.applicationContext,
      data: {
        location: this.currentLocation,
        app_id: this.currentAppId,
      },
      hidden: true,
    };

    return [timerangeAttachment, appContext];
  }
}
