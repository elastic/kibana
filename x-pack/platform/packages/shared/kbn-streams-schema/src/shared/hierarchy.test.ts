/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isRoot,
  getRoot,
  getParentId,
  getAncestors,
  getAncestorsAndSelf,
  isChildOf,
  isDescendantOf,
  isParentName,
  getSegments,
} from './hierarchy';

describe('hierarchy', () => {
  describe('isRoot', () => {
    describe('single-segment roots', () => {
      it('should identify single-segment roots', () => {
        expect(isRoot('logs')).toBe(true);
        expect(isRoot('metrics')).toBe(true);
        expect(isRoot('traces')).toBe(true);
      });
    });

    describe('multi-segment known roots', () => {
      it('should identify logs.otel as root', () => {
        expect(isRoot('logs.otel')).toBe(true);
      });

      it('should identify logs.ecs as root', () => {
        expect(isRoot('logs.ecs')).toBe(true);
      });
    });

    describe('non-root streams', () => {
      it('should not identify child streams as roots', () => {
        expect(isRoot('logs.child')).toBe(false);
        expect(isRoot('logs.otel.child')).toBe(false);
        expect(isRoot('logs.ecs.child')).toBe(false);
      });

      it('should not identify deeply nested streams as roots', () => {
        expect(isRoot('logs.ecs.child.child')).toBe(false);
        expect(isRoot('logs.otel.a.b.c')).toBe(false);
      });
    });

    describe('edge cases - similar names', () => {
      it('should not identify similar names as roots', () => {
        expect(isRoot('logs.ecsh')).toBe(false);
        expect(isRoot('logs.otelextra')).toBe(false);
        expect(isRoot('logs.ecosystem')).toBe(false);
      });
    });
  });

  describe('getRoot', () => {
    describe('single-segment roots', () => {
      it('should return the root for single-segment roots', () => {
        expect(getRoot('logs')).toBe('logs');
        expect(getRoot('metrics')).toBe('metrics');
        expect(getRoot('traces')).toBe('traces');
      });
    });

    describe('multi-segment roots', () => {
      it('should return logs.otel for logs.otel', () => {
        expect(getRoot('logs.otel')).toBe('logs.otel');
      });

      it('should return logs.ecs for logs.ecs', () => {
        expect(getRoot('logs.ecs')).toBe('logs.ecs');
      });
    });

    describe('children of single-segment roots', () => {
      it('should return logs for logs children', () => {
        expect(getRoot('logs.child')).toBe('logs');
        expect(getRoot('logs.app1')).toBe('logs');
        expect(getRoot('logs.app1.sub')).toBe('logs');
      });
    });

    describe('children of multi-segment roots', () => {
      it('should return logs.otel for logs.otel children', () => {
        expect(getRoot('logs.otel.child')).toBe('logs.otel');
        expect(getRoot('logs.otel.nginx')).toBe('logs.otel');
        expect(getRoot('logs.otel.nginx.access')).toBe('logs.otel');
      });

      it('should return logs.ecs for logs.ecs children', () => {
        expect(getRoot('logs.ecs.child')).toBe('logs.ecs');
        expect(getRoot('logs.ecs.apache')).toBe('logs.ecs');
        expect(getRoot('logs.ecs.apache.error')).toBe('logs.ecs');
      });
    });

    describe('deep nesting', () => {
      it('should return correct root for deeply nested streams', () => {
        expect(getRoot('logs.ecs.child.child.child')).toBe('logs.ecs');
        expect(getRoot('logs.otel.a.b.c.d.e')).toBe('logs.otel');
        expect(getRoot('logs.app.sub.sub.sub')).toBe('logs');
      });
    });

    describe('edge cases - similar names', () => {
      it('should handle names similar to multi-segment roots', () => {
        expect(getRoot('logs.ecsh')).toBe('logs');
        expect(getRoot('logs.otelextra')).toBe('logs');
        expect(getRoot('logs.ecosystem')).toBe('logs');
      });

      it('should correctly match based on exact prefix with dot', () => {
        expect(getRoot('logs.ecsh.child')).toBe('logs');
        expect(getRoot('logs.otelextra.child')).toBe('logs');
      });
    });
  });

  describe('getParentId', () => {
    describe('roots have no parent', () => {
      it('should return undefined for single-segment roots', () => {
        expect(getParentId('logs')).toBeUndefined();
        expect(getParentId('metrics')).toBeUndefined();
      });

      it('should return undefined for multi-segment roots', () => {
        expect(getParentId('logs.otel')).toBeUndefined();
        expect(getParentId('logs.ecs')).toBeUndefined();
      });
    });

    describe('direct children', () => {
      it('should return parent for children of single-segment roots', () => {
        expect(getParentId('logs.child')).toBe('logs');
        expect(getParentId('logs.app1')).toBe('logs');
        expect(getParentId('metrics.host')).toBe('metrics');
      });

      it('should return parent for children of multi-segment roots', () => {
        expect(getParentId('logs.otel.child')).toBe('logs.otel');
        expect(getParentId('logs.ecs.child')).toBe('logs.ecs');
      });
    });

    describe('multi-level nesting', () => {
      it('should return immediate parent for nested streams', () => {
        expect(getParentId('logs.ecs.child.child')).toBe('logs.ecs.child');
        expect(getParentId('logs.otel.a.b')).toBe('logs.otel.a');
        expect(getParentId('logs.otel.a.b.c')).toBe('logs.otel.a.b');
      });

      it('should handle deep nesting correctly', () => {
        expect(getParentId('logs.ecs.a.b.c.d')).toBe('logs.ecs.a.b.c');
      });
    });

    describe('edge cases', () => {
      it('should handle streams with similar names to roots', () => {
        expect(getParentId('logs.ecsh')).toBe('logs');
        expect(getParentId('logs.otelextra')).toBe('logs');
      });
    });
  });

  describe('getAncestors', () => {
    describe('roots have no ancestors', () => {
      it('should return empty array for single-segment roots', () => {
        expect(getAncestors('logs')).toEqual([]);
        expect(getAncestors('metrics')).toEqual([]);
      });

      it('should return empty array for multi-segment roots', () => {
        expect(getAncestors('logs.otel')).toEqual([]);
        expect(getAncestors('logs.ecs')).toEqual([]);
      });
    });

    describe('direct children', () => {
      it('should return single parent for first-level children', () => {
        expect(getAncestors('logs.child')).toEqual(['logs']);
        expect(getAncestors('logs.otel.child')).toEqual(['logs.otel']);
        expect(getAncestors('logs.ecs.child')).toEqual(['logs.ecs']);
      });
    });

    describe('multi-level nesting', () => {
      it('should return full ancestor chain in correct order', () => {
        expect(getAncestors('logs.ecs.child.child')).toEqual(['logs.ecs', 'logs.ecs.child']);
      });

      it('should handle deep nesting', () => {
        expect(getAncestors('logs.otel.a.b.c')).toEqual([
          'logs.otel',
          'logs.otel.a',
          'logs.otel.a.b',
        ]);
      });

      it('should maintain root-to-parent order', () => {
        const ancestors = getAncestors('logs.ecs.a.b.c');
        expect(ancestors).toEqual(['logs.ecs', 'logs.ecs.a', 'logs.ecs.a.b']);
        // Verify order is from root to immediate parent
        expect(ancestors[0]).toBe('logs.ecs');
        expect(ancestors[ancestors.length - 1]).toBe('logs.ecs.a.b');
      });
    });
  });

  describe('getAncestorsAndSelf', () => {
    it('should include the stream itself', () => {
      expect(getAncestorsAndSelf('logs.ecs.child')).toEqual(['logs.ecs', 'logs.ecs.child']);
    });

    it('should return only self for roots', () => {
      expect(getAncestorsAndSelf('logs')).toEqual(['logs']);
      expect(getAncestorsAndSelf('logs.ecs')).toEqual(['logs.ecs']);
    });

    it('should handle deep nesting', () => {
      expect(getAncestorsAndSelf('logs.otel.a.b')).toEqual([
        'logs.otel',
        'logs.otel.a',
        'logs.otel.a.b',
      ]);
    });
  });

  describe('isDescendantOf', () => {
    describe('valid descendants in same hierarchy', () => {
      it('should return true for direct children', () => {
        expect(isDescendantOf('logs', 'logs.child')).toBe(true);
        expect(isDescendantOf('logs.ecs', 'logs.ecs.child')).toBe(true);
        expect(isDescendantOf('logs.otel', 'logs.otel.child')).toBe(true);
      });

      it('should return true for any descendant in same hierarchy', () => {
        expect(isDescendantOf('logs.ecs', 'logs.ecs.child.child')).toBe(true);
        expect(isDescendantOf('logs.ecs', 'logs.ecs.a.b.c')).toBe(true);
        expect(isDescendantOf('logs.ecs.child', 'logs.ecs.child.child')).toBe(true);
      });
    });

    describe('cross-hierarchy prevention', () => {
      it('should prevent logs.ecs children from being descendants of logs', () => {
        expect(isDescendantOf('logs', 'logs.ecs.child')).toBe(false);
        expect(isDescendantOf('logs', 'logs.ecs.child.child')).toBe(false);
      });

      it('should prevent logs.otel children from being descendants of logs', () => {
        expect(isDescendantOf('logs', 'logs.otel.child')).toBe(false);
        expect(isDescendantOf('logs', 'logs.otel.child.child')).toBe(false);
      });

      it('should prevent cross-hierarchy between logs.ecs and logs.otel', () => {
        expect(isDescendantOf('logs.ecs', 'logs.otel.child')).toBe(false);
        expect(isDescendantOf('logs.otel', 'logs.ecs.child')).toBe(false);
      });
    });

    describe('root streams cannot be descendants', () => {
      it('should return false when child is a root', () => {
        expect(isDescendantOf('logs', 'logs.otel')).toBe(false);
        expect(isDescendantOf('logs', 'logs.ecs')).toBe(false);
      });
    });

    describe('invalid inputs', () => {
      it('should return false for same stream', () => {
        expect(isDescendantOf('logs', 'logs')).toBe(false);
        expect(isDescendantOf('logs.ecs', 'logs.ecs')).toBe(false);
      });

      it('should return false for reverse relationship', () => {
        expect(isDescendantOf('logs.child', 'logs')).toBe(false);
        expect(isDescendantOf('logs.ecs.child', 'logs.ecs')).toBe(false);
      });
    });
  });

  describe('isChildOf', () => {
    describe('direct children', () => {
      it('should return true for direct children only', () => {
        expect(isChildOf('logs', 'logs.child')).toBe(true);
        expect(isChildOf('logs.ecs', 'logs.ecs.child')).toBe(true);
        expect(isChildOf('logs.otel', 'logs.otel.child')).toBe(true);
      });
    });

    describe('root streams cannot be children', () => {
      it('should return false when child is a root', () => {
        expect(isChildOf('logs', 'logs.ecs')).toBe(false);
        expect(isChildOf('logs', 'logs.otel')).toBe(false);
      });
    });

    describe('intermediate nodes', () => {
      it('should correctly identify parent-child at any level', () => {
        expect(isChildOf('logs.ecs.child', 'logs.ecs.child.child')).toBe(true);
        expect(isChildOf('logs.otel.a', 'logs.otel.a.b')).toBe(true);
      });
    });
  });

  describe('isParentName', () => {
    describe('direct parent relationships', () => {
      it('should return true for direct parent of single-segment root children', () => {
        expect(isParentName('logs', 'logs.child')).toBe(true);
        expect(isParentName('logs', 'logs.app1')).toBe(true);
        expect(isParentName('metrics', 'metrics.host')).toBe(true);
      });

      it('should return true for direct parent of multi-segment root children', () => {
        expect(isParentName('logs.otel', 'logs.otel.nginx')).toBe(true);
        expect(isParentName('logs.otel', 'logs.otel.child')).toBe(true);
        expect(isParentName('logs.ecs', 'logs.ecs.apache')).toBe(true);
        expect(isParentName('logs.ecs', 'logs.ecs.child')).toBe(true);
      });

      it('should return true for parent-child at any nesting level', () => {
        expect(isParentName('logs.otel.nginx', 'logs.otel.nginx.access')).toBe(true);
        expect(isParentName('logs.ecs.child', 'logs.ecs.child.child')).toBe(true);
        expect(isParentName('logs.otel.a.b', 'logs.otel.a.b.c')).toBe(true);
      });
    });

    describe('non-parent relationships', () => {
      it('should return false for grandparent relationships', () => {
        expect(isParentName('logs', 'logs.child.child')).toBe(false);
        expect(isParentName('logs.otel', 'logs.otel.child.child')).toBe(false);
        expect(isParentName('logs.ecs', 'logs.ecs.a.b')).toBe(false);
      });

      it('should return false for sibling relationships', () => {
        expect(isParentName('logs.child1', 'logs.child2')).toBe(false);
        expect(isParentName('logs.otel.a', 'logs.otel.b')).toBe(false);
        expect(isParentName('logs.ecs.child1', 'logs.ecs.child2')).toBe(false);
      });

      it('should return false for unrelated streams', () => {
        expect(isParentName('logs', 'metrics.host')).toBe(false);
        expect(isParentName('logs.otel', 'logs.ecs.child')).toBe(false);
        expect(isParentName('metrics', 'logs.child')).toBe(false);
      });

      it('should return false when descendant is ancestor', () => {
        expect(isParentName('logs.child', 'logs')).toBe(false);
        expect(isParentName('logs.otel.child', 'logs.otel')).toBe(false);
      });
    });

    describe('root stream edge cases', () => {
      it('should return false when descendant is a root stream', () => {
        expect(isParentName('logs', 'logs.otel')).toBe(false);
        expect(isParentName('logs', 'logs.ecs')).toBe(false);
        expect(isParentName('something', 'logs')).toBe(false);
      });

      it('should return false when both are root streams', () => {
        expect(isParentName('logs', 'logs')).toBe(false);
        expect(isParentName('logs.otel', 'logs.otel')).toBe(false);
        expect(isParentName('logs.ecs', 'logs.ecs')).toBe(false);
      });
    });

    describe('cross-root boundaries', () => {
      it('should return false for streams from different root hierarchies', () => {
        expect(isParentName('logs', 'logs.otel.child')).toBe(false);
        expect(isParentName('logs', 'logs.ecs.child')).toBe(false);
        expect(isParentName('logs.otel', 'logs.child')).toBe(false);
        expect(isParentName('logs.ecs', 'logs.child')).toBe(false);
      });
    });
  });

  describe('getSegments', () => {
    it('should return single-segment root streams as single segment', () => {
      expect(getSegments('logs')).toEqual(['logs']);
    });

    it('should return multi-segment root streams as single segment', () => {
      // Multi-segment roots like logs.otel and logs.ecs should be treated as single segments
      expect(getSegments('logs.otel')).toEqual(['logs.otel']);
      expect(getSegments('logs.ecs')).toEqual(['logs.ecs']);
    });

    it('should split children of single-segment roots correctly', () => {
      // Children of 'logs' root
      expect(getSegments('logs.child')).toEqual(['logs', 'child']);
      expect(getSegments('logs.a.b')).toEqual(['logs', 'a', 'b']);
    });

    it('should split children of multi-segment roots correctly', () => {
      // Children of 'logs.otel' root
      expect(getSegments('logs.otel.child')).toEqual(['logs.otel', 'child']);
      expect(getSegments('logs.otel.a.b')).toEqual(['logs.otel', 'a', 'b']);
      // Children of 'logs.ecs' root
      expect(getSegments('logs.ecs.child')).toEqual(['logs.ecs', 'child']);
      expect(getSegments('logs.ecs.a.b.c')).toEqual(['logs.ecs', 'a', 'b', 'c']);
    });

    it('should handle unknown stream types with simple split', () => {
      // Unknown stream types should fall back to simple dot split
      expect(getSegments('metrics')).toEqual(['metrics']);
      expect(getSegments('metrics.system')).toEqual(['metrics', 'system']);
      expect(getSegments('traces.app.endpoint')).toEqual(['traces', 'app', 'endpoint']);
    });
  });

  describe('integration scenarios', () => {
    describe('tree building scenario', () => {
      it('should correctly identify hierarchy for tree placement', () => {
        // logs.ecs.child should NOT be placed under logs
        expect(isDescendantOf('logs', 'logs.ecs.child')).toBe(false);

        // logs.ecs.child SHOULD be placed under logs.ecs
        expect(isDescendantOf('logs.ecs', 'logs.ecs.child')).toBe(true);

        // logs.child SHOULD be placed under logs
        expect(isDescendantOf('logs', 'logs.child')).toBe(true);
      });

      it('should handle nested children correctly', () => {
        // logs.ecs.child.child should be found through:
        // 1. logs.ecs (yes, descendant)
        // 2. logs.ecs.child (yes, descendant)
        expect(isDescendantOf('logs.ecs', 'logs.ecs.child.child')).toBe(true);
        expect(isDescendantOf('logs.ecs.child', 'logs.ecs.child.child')).toBe(true);
      });
    });

    describe('parent identification scenario', () => {
      it('should identify correct parent for UI display', () => {
        expect(getParentId('logs.ecs.child')).toBe('logs.ecs');
        expect(getParentId('logs.otel.child')).toBe('logs.otel');
        expect(getParentId('logs.child')).toBe('logs');
      });
    });
  });
});
