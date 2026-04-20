/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../types/domain';
import { SECURITY_SOLUTION_OWNER } from '../../constants';
import { isMigratedAttachmentType, toUnifiedAttachmentType } from './migration_utils';

const owner = SECURITY_SOLUTION_OWNER;

describe('migration_utils', () => {
  describe('isMigratedAttachmentType', () => {
    it('is true for legacy migrated attachment types', () => {
      expect(isMigratedAttachmentType(AttachmentType.user, owner)).toBe(true);
      expect(isMigratedAttachmentType('user', owner)).toBe(true);
      expect(isMigratedAttachmentType('event', owner)).toBe(true);
    });

    it('is true for owner-scoped unified attachment types', () => {
      expect(isMigratedAttachmentType('comment', owner)).toBe(true);
      expect(isMigratedAttachmentType('security.event', 'security')).toBe(true);
    });

    it('is false for non-migrated attachment types', () => {
      expect(isMigratedAttachmentType(AttachmentType.alert, owner)).toBe(false);
      expect(isMigratedAttachmentType('custom', owner)).toBe(false);
    });
  });

  describe('toUnifiedAttachmentType', () => {
    it('does not produce undefined prefixes for unknown owners', () => {
      expect(toUnifiedAttachmentType(AttachmentType.event, 'unknownOwner')).toBe(
        AttachmentType.event
      );
    });
  });
});
