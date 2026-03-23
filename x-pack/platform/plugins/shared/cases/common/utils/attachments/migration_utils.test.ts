/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../types/domain';
import { isMigratedAttachmentType } from './migration_utils';

describe('migration_utils', () => {
  describe('isMigratedAttachmentType', () => {
    it('is true for legacy user comments and unified comment type', () => {
      expect(isMigratedAttachmentType(AttachmentType.user)).toBe(true);
      expect(isMigratedAttachmentType('user')).toBe(true);
      expect(isMigratedAttachmentType('comment')).toBe(true);
    });

    it('is false for non-migrated attachment types', () => {
      expect(isMigratedAttachmentType(AttachmentType.alert)).toBe(false);
      expect(isMigratedAttachmentType('custom')).toBe(false);
    });
  });
});
