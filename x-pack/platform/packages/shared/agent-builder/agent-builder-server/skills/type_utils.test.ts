/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Directory, FileDirectory, FilePathsFromStructure } from './type_utils';

/**
 * Test directory structure - different from the actual structure to verify
 * the type system works correctly
 */
type TestDirectoryStructure = Directory<{
  test: Directory<{
    level1: FileDirectory<{
      subdir1: FileDirectory;
      subdir2: FileDirectory<{
        nested: FileDirectory;
      }>;
    }>;
    level2: FileDirectory;
    level3: Directory<{
      noFiles: Directory<{
        deep: FileDirectory;
      }>;
    }>;
  }>;
}>;

/**
 * Extract valid paths from the test structure
 */
type TestDirectoryPath = FilePathsFromStructure<TestDirectoryStructure>;

/**
 * Type helper to check if a type is exactly equal to another type
 */
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

/**
 * Type helper to verify that a path is included in the valid paths
 */
type IsValidPath<Path extends string> = Path extends TestDirectoryPath ? true : false;

/**
 * Type helper to verify that a path is NOT included in the valid paths
 */
type IsInvalidPath<Path extends string> = Path extends TestDirectoryPath ? false : true;

describe('FilePathsFromStructure type', () => {
  describe('valid paths', () => {
    it('should accept valid FileDirectory paths', () => {
      // These should compile without errors
      const validPath1: TestDirectoryPath = 'test/level1';
      const validPath2: TestDirectoryPath = 'test/level1/subdir1';
      const validPath3: TestDirectoryPath = 'test/level1/subdir2';
      const validPath4: TestDirectoryPath = 'test/level1/subdir2/nested';
      const validPath5: TestDirectoryPath = 'test/level2';
      const validPath6: TestDirectoryPath = 'test/level3/noFiles/deep';

      // Verify the types are correct
      type _Test1 = Expect<IsValidPath<'test/level1'>>;
      type _Test2 = Expect<IsValidPath<'test/level1/subdir1'>>;
      type _Test3 = Expect<IsValidPath<'test/level1/subdir2'>>;
      type _Test4 = Expect<IsValidPath<'test/level1/subdir2/nested'>>;
      type _Test5 = Expect<IsValidPath<'test/level2'>>;
      type _Test6 = Expect<IsValidPath<'test/level3/noFiles/deep'>>;

      const _t1: _Test1 = true;
      const _t2: _Test2 = true;
      const _t3: _Test3 = true;
      const _t4: _Test4 = true;
      const _t5: _Test5 = true;
      const _t6: _Test6 = true;
      // Type-level tests - variables exist only for type checking
      expect(_t1).toBe(true);
      expect(_t2).toBe(true);
      expect(_t3).toBe(true);
      expect(_t4).toBe(true);
      expect(_t5).toBe(true);
      expect(_t6).toBe(true);

      expect(validPath1).toBe('test/level1');
      expect(validPath2).toBe('test/level1/subdir1');
      expect(validPath3).toBe('test/level1/subdir2');
      expect(validPath4).toBe('test/level1/subdir2/nested');
      expect(validPath5).toBe('test/level2');
      expect(validPath6).toBe('test/level3/noFiles/deep');
    });

    it('should verify all expected paths are included', () => {
      // Verify the union type contains all expected paths
      type AllPaths = TestDirectoryPath;
      type ExpectedPaths =
        | 'test/level1'
        | 'test/level1/subdir1'
        | 'test/level1/subdir2'
        | 'test/level1/subdir2/nested'
        | 'test/level2'
        | 'test/level3/noFiles/deep';

      // This will fail at compile time if paths don't match
      type _PathsMatch = Expect<Equal<AllPaths, ExpectedPaths>>;
      const __: _PathsMatch = true;
      // Type-level test - variable exists only for type checking
      expect(__).toBe(true);
    });
  });

  describe('invalid paths', () => {
    it('should reject paths to Directory (non-FileDirectory)', () => {
      // These should NOT be valid paths (they point to Directory, not FileDirectory)
      type _Test1 = Expect<IsInvalidPath<'test'>>;
      type _Test2 = Expect<IsInvalidPath<'test/level3'>>;
      type _Test3 = Expect<IsInvalidPath<'test/level3/noFiles'>>;

      const _1: _Test1 = true;
      const _2: _Test2 = true;
      const _3: _Test3 = true;
      // Type-level tests - variables exist only for type checking
      expect(_1).toBe(true);
      expect(_2).toBe(true);
      expect(_3).toBe(true);
    });

    it('should reject non-existent paths', () => {
      // These paths don't exist in the structure
      type _Test1 = Expect<IsInvalidPath<'test/invalid'>>;
      type _Test2 = Expect<IsInvalidPath<'test/level1/invalid'>>;
      type _Test3 = Expect<IsInvalidPath<'invalid/level1'>>;
      type _Test4 = Expect<IsInvalidPath<'test/level1/subdir1/invalid'>>;

      const _1: _Test1 = true;
      const _2: _Test2 = true;
      const _3: _Test3 = true;
      const _4: _Test4 = true;
      // Type-level tests - variables exist only for type checking
      expect(_1).toBe(true);
      expect(_2).toBe(true);
      expect(_3).toBe(true);
      expect(_4).toBe(true);
    });

    it('should reject empty path', () => {
      // Empty path should not be valid (root level is skipped)
      type _Test1 = Expect<IsInvalidPath<''>>;
      const _1: _Test1 = true;
      // Type-level test - variable exists only for type checking
      expect(_1).toBe(true);
    });
  });

  describe('path structure validation', () => {
    it('should only allow paths that end at FileDirectory', () => {
      // Verify that paths must end at a FileDirectory, not a Directory
      type _ValidEnding = Expect<IsValidPath<'test/level2'>>; // FileDirectory
      type _InvalidEnding = Expect<IsInvalidPath<'test'>>; // Directory

      const _1: _ValidEnding = true;
      const _2: _InvalidEnding = true;
      // Type-level tests - variables exist only for type checking
      expect(_1).toBe(true);
      expect(_2).toBe(true);
    });

    it('should handle nested FileDirectory structures correctly', () => {
      // Verify nested FileDirectory paths work
      type _Nested1 = Expect<IsValidPath<'test/level1/subdir1'>>;
      type _Nested2 = Expect<IsValidPath<'test/level1/subdir2'>>;
      type _Nested3 = Expect<IsValidPath<'test/level1/subdir2/nested'>>;

      const _1: _Nested1 = true;
      const _2: _Nested2 = true;
      const _3: _Nested3 = true;
      // Type-level tests - variables exist only for type checking
      expect(_1).toBe(true);
      expect(_2).toBe(true);
      expect(_3).toBe(true);
    });
  });
});
