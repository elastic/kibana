/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItem, ItemSet } from '@kbn/ml-agg-utils';

import { getSignificantItemGroups } from './get_significant_item_groups';

/**
 * OOM STRESS TEST
 *
 * This test creates artificial datasets designed to stress the grouping algorithm
 * and potentially cause OOM or infinite loop conditions.
 *
 * Edge cases being tested:
 * 1. High cardinality with many overlapping combinations
 * 2. Deep hierarchical field relationships
 * 3. Large number of itemsets with complex overlap patterns
 * 4. Combinatorial explosion in tree building
 *
 * WARNING: This test is designed to potentially cause OOM or hang.
 * Run with caution and appropriate memory/timeout limits.
 */
describe('getSignificantItemGroups OOM stress test', () => {
  /**
   * Generates a dataset with high cardinality and many overlapping combinations
   * that could cause the O(n³) subset checking algorithm to explode
   */
  function generateHighCardinalityOverlappingDataset() {
    const fields = ['field_a', 'field_b', 'field_c', 'field_d', 'field_e'];
    const valuesPerField = 20; // 20 values per field

    const significantItems: SignificantItem[] = [];
    const itemSets: ItemSet[] = [];

    // Generate significant items for each field/value combination
    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:value_${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `value_${i}`,
          doc_count: 1000 - i * 10,
          bg_count: 500,
          total_doc_count: 10000,
          total_bg_count: 5000,
          score: 10 - i * 0.1,
          pValue: 0.001 + i * 0.0001,
          normalizedScore: 0.9 - i * 0.01,
        });
      }
    });

    // Generate itemsets with overlapping combinations
    // This creates a scenario where many subsets overlap, causing
    // the O(n³) filtering algorithm to perform worst-case checks
    const itemSetCount = 500; // Generate 500 itemsets

    for (let i = 0; i < itemSetCount; i++) {
      const setSize = 2 + (i % 4); // Sets of size 2-5
      const set: Array<{ fieldName: string; fieldValue: string }> = [];

      // Create overlapping patterns by reusing field/value combinations
      for (let j = 0; j < setSize; j++) {
        const fieldIndex = (i + j) % fields.length;
        const valueIndex = (i * 2 + j) % valuesPerField;

        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `value_${valueIndex}`,
        });
      }

      itemSets.push({
        set,
        size: setSize,
        maxPValue: 0.001 + i * 0.00001,
        doc_count: 1000 - i,
        support: 0.1 - i * 0.0001,
        total_doc_count: 10000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  /**
   * Generates a dataset that creates a deeply nested tree structure
   * with many branches at each level, causing recursive explosion
   */
  function generateDeepHierarchicalDataset() {
    const fieldCount = 10; // 10 levels deep
    const fields = Array.from({ length: fieldCount }, (_, i) => `field_${i}`);
    const valuesPerField = 15; // 15 values per field = 15^10 potential combinations

    const significantItems: SignificantItem[] = [];
    const itemSets: ItemSet[] = [];

    // Generate significant items
    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:val${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `val${i}`,
          doc_count: 5000 - i * 50,
          bg_count: 1000,
          total_doc_count: 50000,
          total_bg_count: 10000,
          score: 20 - i * 0.2,
          pValue: 0.0001 + i * 0.00001,
          normalizedScore: 0.95 - i * 0.01,
        });
      }
    });

    // Generate itemsets that create deep hierarchical relationships
    // Each itemset includes items from consecutive fields, creating
    // a tree that must be traversed deeply
    const itemSetCount = 1000;

    for (let i = 0; i < itemSetCount; i++) {
      const startField = i % (fieldCount - 2);
      const setSize = 3 + (i % 5); // Sets of size 3-7
      const set: Array<{ fieldName: string; fieldValue: string }> = [];

      for (let j = 0; j < setSize && startField + j < fieldCount; j++) {
        const valueIndex = (i + j * 3) % valuesPerField;
        set.push({
          fieldName: fields[startField + j],
          fieldValue: `val${valueIndex}`,
        });
      }

      itemSets.push({
        set,
        size: setSize,
        maxPValue: 0.0001 + i * 0.000001,
        doc_count: 5000 - i * 2,
        support: 0.1 - i * 0.00005,
        total_doc_count: 50000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  /**
   * Generates a dataset that creates maximum overlap between groups
   * This stresses the subset checking algorithm where almost every
   * itemset is a potential subset of multiple others
   */
  function generateMaximalOverlapDataset() {
    const fields = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];
    const valuesPerField = 25;

    const significantItems: SignificantItem[] = [];
    const itemSets: ItemSet[] = [];

    // Generate significant items
    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:v${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `v${i}`,
          doc_count: 8000 - i * 100,
          bg_count: 2000,
          total_doc_count: 80000,
          total_bg_count: 20000,
          score: 15 - i * 0.15,
          pValue: 0.0005 + i * 0.00005,
          normalizedScore: 0.92 - i * 0.01,
        });
      }
    });

    // Generate itemsets where each set is carefully crafted to overlap
    // with many others, creating worst-case O(n³) behavior
    const baseSet: Array<{ fieldName: string; fieldValue: string }> = [];
    for (let i = 0; i < 4; i++) {
      baseSet.push({
        fieldName: fields[i],
        fieldValue: `v${i}`,
      });
    }

    // Create 2000 itemsets that all share common elements
    const itemSetCount = 2000;
    for (let i = 0; i < itemSetCount; i++) {
      const set = [...baseSet];

      // Add varying additional elements to create subsets
      const additionalElements = i % 5;
      for (let j = 0; j < additionalElements; j++) {
        const fieldIndex = (4 + j + i) % fields.length;
        const valueIndex = (i + j * 2) % valuesPerField;
        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `v${valueIndex}`,
        });
      }

      itemSets.push({
        set,
        size: set.length,
        maxPValue: 0.0005,
        doc_count: 8000 - i * 3,
        support: 0.1,
        total_doc_count: 80000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  // Test 1: High cardinality overlapping dataset
  it('handles high cardinality overlapping dataset without OOM', () => {
    const { significantItems, itemSets, fields } = generateHighCardinalityOverlappingDataset();

    console.log('Test 1: High Cardinality Dataset');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  // Test 2: Deep hierarchical dataset
  it('handles deep hierarchical dataset without OOM', () => {
    const { significantItems, itemSets, fields } = generateDeepHierarchicalDataset();

    console.log('Test 2: Deep Hierarchical Dataset');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  // Test 3: Maximal overlap dataset (most likely to cause issues)
  it('handles maximal overlap dataset without OOM', () => {
    const { significantItems, itemSets, fields } = generateMaximalOverlapDataset();

    console.log('Test 3: Maximal Overlap Dataset (EXTREME STRESS TEST)');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  // Test 4: Combined worst-case scenario
  it('handles combined worst-case scenario', () => {
    // Combine all problematic patterns
    const fieldCount = 12;
    const fields = Array.from({ length: fieldCount }, (_, i) => `field_${i}`);
    const valuesPerField = 30;

    const significantItems: SignificantItem[] = [];

    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:value_${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `value_${i}`,
          doc_count: 10000 - i * 50,
          bg_count: 3000,
          total_doc_count: 100000,
          total_bg_count: 30000,
          score: 25 - i * 0.1,
          pValue: 0.0001,
          normalizedScore: 0.95,
        });
      }
    });

    // Generate extremely large and overlapping itemsets
    const itemSets: ItemSet[] = [];
    const itemSetCount = 5000; // 5000 itemsets!

    for (let i = 0; i < itemSetCount; i++) {
      const setSize = 3 + (i % 8);
      const set: Array<{ fieldName: string; fieldValue: string }> = [];

      for (let j = 0; j < setSize; j++) {
        const fieldIndex = (i + j) % fieldCount;
        const valueIndex = (i * 3 + j * 2) % valuesPerField;
        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `value_${valueIndex}`,
        });
      }

      itemSets.push({
        set,
        size: setSize,
        maxPValue: 0.0001,
        doc_count: 10000 - i,
        support: 0.1,
        total_doc_count: 100000,
      });
    }

    console.log('Test 4: COMBINED WORST-CASE SCENARIO');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);
    console.log('WARNING: This test may cause OOM or hang!');

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
  });

  /**
   * PATHOLOGICAL TEST: Non-Subset Siblings with Maximum Overlap
   *
   * This generator creates itemsets where:
   * 1. NO itemset is a complete subset of another (prevents elimination)
   * 2. Each itemset shares N-1 elements with many others (maximum comparison work)
   * 3. Large number of itemsets (15,000+)
   *
   * This forces the O(n³) subset checking algorithm to:
   * - Check EVERY itemset against EVERY other itemset
   * - Perform deep comparisons (since they share many elements)
   * - Never eliminate any itemsets (since none are true subsets)
   *
   * Expected behavior: Should cause extreme memory pressure and/or timeout
   */
  function generatePathologicalNonSubsetDataset(itemSetCount = 15000) {
    const fields = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10'];
    const valuesPerField = 200; // Large value space

    const significantItems: SignificantItem[] = [];

    // Generate significant items
    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:v${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `v${i}`,
          doc_count: 50000,
          bg_count: 10000,
          total_doc_count: 500000,
          total_bg_count: 100000,
          score: 20,
          pValue: 0.0001,
          normalizedScore: 0.9,
        });
      }
    });

    const itemSets: ItemSet[] = [];
    const setSize = 5; // Fixed size of 5

    // Strategy: Create itemsets where each one is UNIQUE but shares
    // exactly 4 elements with hundreds of others
    // This prevents subset elimination but maximizes comparison work

    for (let i = 0; i < itemSetCount; i++) {
      const set: Array<{ fieldName: string; fieldValue: string }> = [];

      // Use a deterministic but spreading pattern to create overlap
      // Each itemset will use different field/value combinations
      // but with high overlap with others

      for (let j = 0; j < setSize; j++) {
        const fieldIndex = (i * 7 + j * 13) % fields.length;
        const valueIndex = (i * 11 + j * 17) % valuesPerField;

        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `v${valueIndex}`,
        });
      }

      // Ensure uniqueness by adding the index as a discriminator to last element
      // This guarantees no two itemsets are identical
      const lastIndex = set.length - 1;
      set[lastIndex] = {
        fieldName: fields[(i * 3) % fields.length],
        fieldValue: `v${i % valuesPerField}`,
      };

      itemSets.push({
        set,
        size: setSize,
        maxPValue: 0.0001,
        doc_count: 50000,
        support: 0.1,
        total_doc_count: 500000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  /**
   * PATHOLOGICAL TEST: Massive Tree Explosion
   *
   * Creates conditions for maximum tree node generation:
   * - Many fields with many values
   * - Itemsets structured to create maximum branching at each tree level
   * - Doc counts varied to prevent collapse optimization
   * - Forces complete tree traversal with no pruning
   */
  function generateTreeExplosionDataset() {
    const fieldCount = 20;
    const fields = Array.from(
      { length: fieldCount },
      (_, i) => `field_${String(i).padStart(2, '0')}`
    );
    const valuesPerField = 80;

    const significantItems: SignificantItem[] = [];

    // Generate significant items
    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:val_${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `val_${i}`,
          doc_count: 100000 - i * 100,
          bg_count: 20000,
          total_doc_count: 1000000,
          total_bg_count: 200000,
          score: 30 - i * 0.01,
          pValue: 0.00001,
          normalizedScore: 0.95,
        });
      }
    });

    // Generate itemsets that force tree explosion
    // Each itemset spans consecutive fields with varying doc counts
    const itemSets: ItemSet[] = [];
    const itemSetCount = 25000;

    for (let i = 0; i < itemSetCount; i++) {
      const startField = i % (fieldCount - 3);
      const setSize = 4; // Fixed size for consistency
      const set: Array<{ fieldName: string; fieldValue: string }> = [];

      for (let j = 0; j < setSize; j++) {
        const fieldIndex = startField + j;
        const valueIndex = (i * 7 + j * 11) % valuesPerField;

        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `val_${valueIndex}`,
        });
      }

      // Vary doc_count to prevent collapse optimization
      const docCount = 100000 - ((i * 3) % 10000);

      itemSets.push({
        set,
        size: setSize,
        maxPValue: 0.00001,
        doc_count: docCount,
        support: 0.1,
        total_doc_count: 1000000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  /**
   * PATHOLOGICAL TEST: String Memory Bomb
   *
   * Creates extremely long field names and values that get concatenated
   * repeatedly during tree building, causing string memory explosion
   */
  function generateStringMemoryBombDataset() {
    const fieldCount = 15;
    const longStringBase = 'x'.repeat(500); // 500 char base

    const fields = Array.from(
      { length: fieldCount },
      (_, i) => `${longStringBase}_field_${i}_${longStringBase}`
    );

    const valuesPerField = 50;
    const significantItems: SignificantItem[] = [];

    fields.forEach((fieldName, fieldIdx) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:${longStringBase}_value_${i}_${longStringBase}`,
          type: 'keyword',
          fieldName,
          fieldValue: `${longStringBase}_value_${i}_${longStringBase}`,
          doc_count: 80000,
          bg_count: 15000,
          total_doc_count: 800000,
          total_bg_count: 150000,
          score: 25,
          pValue: 0.0001,
          normalizedScore: 0.9,
        });
      }
    });

    // Generate many itemsets with these long strings
    const itemSets: ItemSet[] = [];
    const itemSetCount = 10000;

    for (let i = 0; i < itemSetCount; i++) {
      const setSize = 4;
      const set: Array<{ fieldName: string; fieldValue: string }> = [];

      for (let j = 0; j < setSize; j++) {
        const fieldIndex = (i + j) % fieldCount;
        const valueIndex = (i * 3 + j * 5) % valuesPerField;

        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `${longStringBase}_value_${valueIndex}_${longStringBase}`,
        });
      }

      itemSets.push({
        set,
        size: setSize,
        maxPValue: 0.0001,
        doc_count: 80000,
        support: 0.1,
        total_doc_count: 800000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  // PATHOLOGICAL TEST 5: Non-Subset Siblings (15K itemsets)
  it('PATHOLOGICAL: Non-subset siblings with 15K itemsets', () => {
    const { significantItems, itemSets, fields } = generatePathologicalNonSubsetDataset(15000);

    console.log('\n=== PATHOLOGICAL TEST 5: Non-Subset Siblings ===');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);
    console.log('- Strategy: Every itemset shares 4/5 elements with many others');
    console.log('- Expected: O(n³) explosion, no subset elimination');
    console.log('WARNING: This will likely cause OOM or extreme timeout!\n');

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
  });

  // PATHOLOGICAL TEST 6: Tree Explosion (25K itemsets)
  it('PATHOLOGICAL: Tree explosion with 25K itemsets', () => {
    const { significantItems, itemSets, fields } = generateTreeExplosionDataset();

    console.log('\n=== PATHOLOGICAL TEST 6: Tree Explosion ===');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);
    console.log('- Strategy: Maximum branching, no collapse, forced deep traversal');
    console.log('- Expected: Recursive explosion, millions of tree nodes');
    console.log('WARNING: This will likely cause OOM or extreme timeout!\n');

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
  });

  // PATHOLOGICAL TEST 7: String Memory Bomb
  it('PATHOLOGICAL: String memory bomb with 10K itemsets', () => {
    const { significantItems, itemSets, fields } = generateStringMemoryBombDataset();

    console.log('\n=== PATHOLOGICAL TEST 7: String Memory Bomb ===');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);
    console.log(`- Field name length: ~${fields[0].length} chars`);
    console.log(`- Strategy: 1KB+ strings repeatedly concatenated during tree building`);
    console.log('- Expected: String memory explosion, hundreds of MB');
    console.log('WARNING: This will likely cause OOM!\n');

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
  });

  // PATHOLOGICAL TEST 8: NUCLEAR OPTION - Combined Pathological Scenarios
  it('PATHOLOGICAL: NUCLEAR - Combined worst case (20K itemsets)', () => {
    // Combine non-subset siblings + tree explosion + large field count
    const { significantItems, itemSets, fields } = generatePathologicalNonSubsetDataset(20000);

    console.log('\n=== PATHOLOGICAL TEST 8: NUCLEAR OPTION ===');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Fields: ${fields.length}`);
    console.log('- Strategy: ALL pathological patterns combined');
    console.log('- Expected: Catastrophic memory usage and/or hang');
    console.log('⚠️  EXTREME WARNING: This WILL cause issues! ⚠️\n');

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
  });

  /**
   * ULTIMATE PATHOLOGICAL TEST: Direct O(n³ × m²) Attack
   *
   * This test is designed to bypass all optimizations and directly trigger
   * the O(n³ × m²) complexity in getSimpleHierarchicalTreeLeaves.
   *
   * Strategy:
   * 1. Generate 50,000+ itemsets that are ALL completely distinct (no subsets)
   * 2. Each itemset has 8-10 items (maximize inner loop comparisons)
   * 3. Structured so they all survive tree filtering and become leaves
   * 4. Each leaf must be compared against all others: 50,000² comparisons
   * 5. Each comparison checks 8-10 items against 8-10 items
   *
   * Expected complexity:
   * - sortedLeaves.length = ~50,000
   * - For each leaf: check against all previous leaves (O(n²))
   * - For each check: compare all items in both groups (O(m²))
   * - Total: 50,000² × 10² = 250 BILLION operations
   *
   * Expected behavior: Should cause timeout or OOM
   */
  function generateUltimateO3AttackDataset() {
    // Use a LARGE number of fields to ensure each itemset can be unique
    const fieldCount = 100;
    const fields = Array.from({ length: fieldCount }, (_, i) => `f${String(i).padStart(3, '0')}`);
    const valuesPerField = 100;

    const significantItems: SignificantItem[] = [];

    // Generate significant items
    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:v${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `v${i}`,
          doc_count: 100000,
          bg_count: 20000,
          total_doc_count: 1000000,
          total_bg_count: 200000,
          score: 30,
          pValue: 0.00001,
          normalizedScore: 0.95,
        });
      }
    });

    // Generate 50,000 itemsets where each is COMPLETELY DISTINCT
    // This ensures they all survive as leaves and none get filtered as subsets
    const itemSets: ItemSet[] = [];
    const itemSetCount = 50000;
    const itemsPerSet = 8; // Large enough to create expensive comparisons

    for (let i = 0; i < itemSetCount; i++) {
      const set: Array<{ fieldName: string; fieldValue: string }> = [];

      // Each itemset uses a unique, non-overlapping set of fields
      // This guarantees no itemset can be a subset of another
      const startField = (i * itemsPerSet) % (fieldCount - itemsPerSet);

      for (let j = 0; j < itemsPerSet; j++) {
        const fieldIndex = startField + j;
        // Use a deterministic pattern for values that ensures uniqueness
        const valueIndex = (i * 7 + j * 13) % valuesPerField;

        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `v${valueIndex}`,
        });
      }

      // Add a unique discriminator using the itemset index
      // This absolutely guarantees each itemset is unique
      const uniqueField = fields[i % fieldCount];
      set.push({
        fieldName: uniqueField,
        fieldValue: `v${i % valuesPerField}`,
      });

      itemSets.push({
        set,
        size: set.length,
        maxPValue: 0.00001,
        doc_count: 100000,
        support: 0.1,
        total_doc_count: 1000000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  /**
   * LOOP VARIANT: Multiple iterations to prevent GC cleanup
   *
   * This variant calls the grouping function multiple times in a loop
   * to accumulate memory and prevent GC from cleaning up between calls.
   */
  function generateMediumO3AttackDataset() {
    const fieldCount = 80;
    const fields = Array.from(
      { length: fieldCount },
      (_, i) => `field${String(i).padStart(2, '0')}`
    );
    const valuesPerField = 80;

    const significantItems: SignificantItem[] = [];

    fields.forEach((fieldName) => {
      for (let i = 0; i < valuesPerField; i++) {
        significantItems.push({
          key: `${fieldName}:val${i}`,
          type: 'keyword',
          fieldName,
          fieldValue: `val${i}`,
          doc_count: 80000,
          bg_count: 15000,
          total_doc_count: 800000,
          total_bg_count: 150000,
          score: 25,
          pValue: 0.0001,
          normalizedScore: 0.92,
        });
      }
    });

    const itemSets: ItemSet[] = [];
    const itemSetCount = 30000;
    const itemsPerSet = 10;

    for (let i = 0; i < itemSetCount; i++) {
      const set: Array<{ fieldName: string; fieldValue: string }> = [];
      const baseField = (i * 3) % (fieldCount - itemsPerSet);

      for (let j = 0; j < itemsPerSet; j++) {
        const fieldIndex = baseField + j;
        const valueIndex = (i * 11 + j * 17) % valuesPerField;

        set.push({
          fieldName: fields[fieldIndex],
          fieldValue: `val${valueIndex}`,
        });
      }

      itemSets.push({
        set,
        size: itemsPerSet,
        maxPValue: 0.0001,
        doc_count: 80000 - (i % 1000),
        support: 0.1,
        total_doc_count: 800000,
      });
    }

    return { significantItems, itemSets, fields };
  }

  // ULTIMATE TEST 9: Direct O(n³ × m²) Attack with 50K itemsets
  it('ULTIMATE: Direct O(n³ × m²) attack with 50K itemsets', () => {
    const { significantItems, itemSets, fields } = generateUltimateO3AttackDataset();

    console.log('\n=== ULTIMATE TEST 9: Direct O(n³ × m²) Attack ===');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Items per set: ${itemSets[0].set.length}`);
    console.log(`- Fields: ${fields.length}`);
    console.log('- Strategy: 50K completely distinct itemsets with 8-10 items each');
    console.log('- Expected: All itemsets survive as leaves, forcing full O(n²) subset checks');
    console.log('- Estimated operations: 50,000² × 10² = 250 BILLION');
    console.log('⚠️  EXTREME WARNING: This will likely timeout or OOM! ⚠️\n');

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = getSignificantItemGroups(itemSets, significantItems, fields);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`- Execution time: ${endTime - startTime}ms`);
    console.log(`- Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Result groups: ${result.length}`);

    expect(result).toBeDefined();
  });

  // ULTIMATE TEST 10: Loop variant to prevent GC (30K itemsets × 3 iterations)
  it('ULTIMATE: Loop variant with 30K itemsets × 3 iterations', () => {
    const { significantItems, itemSets, fields } = generateMediumO3AttackDataset();

    console.log('\n=== ULTIMATE TEST 10: Loop Variant (GC Prevention) ===');
    console.log(`- Significant items: ${significantItems.length}`);
    console.log(`- Item sets: ${itemSets.length}`);
    console.log(`- Items per set: ${itemSets[0].set.length}`);
    console.log(`- Fields: ${fields.length}`);
    console.log('- Strategy: Call grouping 3 times in loop to accumulate memory');
    console.log('- Expected: Memory accumulation, no GC cleanup between iterations');
    console.log('⚠️  WARNING: This will accumulate memory aggressively! ⚠️\n');

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const results = [];

    // Call multiple times to prevent GC from cleaning up
    for (let iteration = 0; iteration < 3; iteration++) {
      console.log(`  Iteration ${iteration + 1}/3...`);
      const iterationStart = Date.now();

      const result = getSignificantItemGroups(itemSets, significantItems, fields);
      results.push(result);

      const iterationEnd = Date.now();
      const currentMemory = process.memoryUsage().heapUsed;
      const iterationMemoryDelta = (currentMemory - startMemory) / 1024 / 1024;

      console.log(`    - Time: ${iterationEnd - iterationStart}ms`);
      console.log(`    - Cumulative memory: ${iterationMemoryDelta.toFixed(2)}MB`);
      console.log(`    - Groups: ${result.length}`);
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

    console.log(`\n- Total execution time: ${endTime - startTime}ms`);
    console.log(`- Total memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`- Results array length: ${results.length}`);

    expect(results).toBeDefined();
    expect(results.length).toBe(3);
  });

  // ULTIMATE TEST 11: Incremental stress test - start small and scale up
  it.skip('ULTIMATE: Incremental scaling test (5K → 10K → 20K → 40K)', () => {
    const testSizes = [5000, 10000, 20000, 40000];
    const metrics: Array<{ size: number; time: number; memory: number; groups: number }> = [];

    console.log('\n=== ULTIMATE TEST 11: Incremental Scaling Test ===');
    console.log('- Testing with increasing itemset counts to find breaking point\n');

    for (const size of testSizes) {
      console.log(`Testing with ${size} itemsets...`);

      const fieldCount = 100;
      const fields = Array.from({ length: fieldCount }, (_, i) => `f${i}`);
      const valuesPerField = 100;

      const significantItems: SignificantItem[] = [];
      fields.forEach((fieldName) => {
        for (let i = 0; i < valuesPerField; i++) {
          significantItems.push({
            key: `${fieldName}:v${i}`,
            type: 'keyword',
            fieldName,
            fieldValue: `v${i}`,
            doc_count: 100000,
            bg_count: 20000,
            total_doc_count: 1000000,
            total_bg_count: 200000,
            score: 30,
            pValue: 0.00001,
            normalizedScore: 0.95,
          });
        }
      });

      const itemSets: ItemSet[] = [];
      const itemsPerSet = 8;

      for (let i = 0; i < size; i++) {
        const set: Array<{ fieldName: string; fieldValue: string }> = [];
        const startField = (i * itemsPerSet) % (fieldCount - itemsPerSet);

        for (let j = 0; j < itemsPerSet; j++) {
          const fieldIndex = startField + j;
          const valueIndex = (i * 7 + j * 13) % valuesPerField;

          set.push({
            fieldName: fields[fieldIndex],
            fieldValue: `v${valueIndex}`,
          });
        }

        itemSets.push({
          set,
          size: itemsPerSet,
          maxPValue: 0.00001,
          doc_count: 100000,
          support: 0.1,
          total_doc_count: 1000000,
        });
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const result = getSignificantItemGroups(itemSets, significantItems, fields);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const timeDelta = endTime - startTime;
      const memoryDelta = (endMemory - startMemory) / 1024 / 1024;

      metrics.push({
        size,
        time: timeDelta,
        memory: memoryDelta,
        groups: result.length,
      });

      console.log(`  - Time: ${timeDelta}ms`);
      console.log(`  - Memory: ${memoryDelta.toFixed(2)}MB`);
      console.log(`  - Groups: ${result.length}\n`);

      // If this iteration took more than 10 seconds, don't try the next size
      if (timeDelta > 10000) {
        console.log('⚠️  Stopping incremental test - execution time exceeded 10s threshold');
        break;
      }
    }

    console.log('=== Scaling Metrics Summary ===');
    metrics.forEach((m) => {
      console.log(`${m.size} itemsets: ${m.time}ms, ${m.memory.toFixed(2)}MB, ${m.groups} groups`);
    });

    expect(metrics.length).toBeGreaterThan(0);
  });
});
