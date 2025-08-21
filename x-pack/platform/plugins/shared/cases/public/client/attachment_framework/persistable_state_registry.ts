/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentRegistry } from '../../../common/registry';
import type { PersistableStateAttachmentType } from './types';

export class PersistableStateAttachmentTypeRegistry extends AttachmentRegistry<PersistableStateAttachmentType> {
  constructor() {
    super('PersistableStateAttachmentTypeRegistry');
  }
}
