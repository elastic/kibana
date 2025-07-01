/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportingSharingData } from '@kbn/reporting-public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import { LensSavedObject } from '../../../common/content_management';

export interface LensSharingData extends ReportingSharingData, Pick<ScreenshotOptions, 'layout'> {
  title: string;
  datatables: Datatable[];
  csvEnabled: boolean;
  // TODO formalize this structure to align with api input, Lens CM and new Lens SO
  getSerializedState: () => Pick<LensSavedObject, 'attributes' | 'references'>;
}
