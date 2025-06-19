/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RelatedSavedObject } from '@kbn/notifications-plugin/server/services/types';
import { ReportingCore } from '../..';

export interface NotifyArgs {
  reporting: ReportingCore;
  index: string;
  id: string;
  contentType?: string | null;
  filename: string;
  relatedObject: RelatedSavedObject;
  emailParams: {
    to?: string[];
    bcc?: string[];
    cc?: string[];
    subject: string;
    spaceId?: string;
  };
}

export interface NotificationService {
  notify: (args: NotifyArgs) => Promise<void>;
}
