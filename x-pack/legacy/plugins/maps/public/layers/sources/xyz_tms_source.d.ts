/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AbstractTMSSource } from './tms_source';
import { XYZTMSSourceDescriptor } from '../../../common/descriptor_types';

export class XYZTMSSource extends AbstractTMSSource {
  constructor(sourceDescriptor: XYZTMSSourceDescriptor, inspectorAdapters: unknown);
}
