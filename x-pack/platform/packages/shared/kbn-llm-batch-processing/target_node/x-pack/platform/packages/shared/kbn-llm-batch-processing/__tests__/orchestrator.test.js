"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../src/orchestrator");
describe('batchProcess', () => {
    it('should process batches concurrently and merge results', async () => {
        const items = Array.from({ length: 100 }, (_, i) => i);
        const processFn = jest.fn(async (batch) => batch.reduce((a, b) => a + b, 0));
        const mergeFn = jest.fn(async ([a, b]) => a + b);
        const result = await (0, orchestrator_1.batchProcess)({
            input: items,
            splitStrategy: 'item-based',
            maxItemsPerBatch: 25,
            processFn,
            mergeFn,
            maxConcurrentBatches: 3,
        });
        // 100 items / 25 per batch = 4 batches
        expect(processFn).toHaveBeenCalledTimes(4);
        // Hierarchical merge: 4 outputs -> 2 -> 1 = 3 merge calls
        expect(mergeFn).toHaveBeenCalledTimes(3);
        // Sum of 0..99 = 4950
        expect(result.output).toBe(4950);
        expect(result.stats.batches).toBe(4);
        expect(result.stats.mergeRounds).toBe(2);
    });
    it('should respect maxConcurrentBatches', async () => {
        const items = Array.from({ length: 10 }, (_, i) => i);
        let concurrent = 0;
        let maxConcurrent = 0;
        const processFn = async (batch) => {
            concurrent++;
            maxConcurrent = Math.max(maxConcurrent, concurrent);
            await new Promise((resolve) => setTimeout(resolve, 10));
            concurrent--;
            return batch.reduce((a, b) => a + b, 0);
        };
        await (0, orchestrator_1.batchProcess)({
            input: items,
            splitStrategy: 'item-based',
            maxItemsPerBatch: 1,
            processFn,
            mergeFn: async ([a, b]) => a + b,
            maxConcurrentBatches: 2,
        });
        expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
    it('should call onProgress callback', async () => {
        const items = [1, 2, 3, 4];
        const progressUpdates = [];
        await (0, orchestrator_1.batchProcess)({
            input: items,
            splitStrategy: 'item-based',
            maxItemsPerBatch: 1,
            processFn: async (batch) => batch[0],
            mergeFn: async ([a, b]) => a + b,
            onProgress: (completed, total) => {
                progressUpdates.push({ completed, total });
            },
        });
        expect(progressUpdates).toEqual([
            { completed: 1, total: 4 },
            { completed: 2, total: 4 },
            { completed: 3, total: 4 },
            { completed: 4, total: 4 },
        ]);
    });
    it('should throw on invalid split strategy', async () => {
        await expect((0, orchestrator_1.batchProcess)({
            input: [1, 2, 3],
            splitStrategy: 'invalid',
            processFn: async (batch) => batch[0],
            mergeFn: async ([a, b]) => a + b,
        })).rejects.toThrow('Unknown split strategy');
    });
});
