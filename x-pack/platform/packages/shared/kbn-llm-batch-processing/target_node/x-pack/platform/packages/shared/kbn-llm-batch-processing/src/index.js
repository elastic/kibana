"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hierarchicalMerge = exports.itemBasedSplit = exports.tokenBasedSplit = exports.batchProcess = void 0;
// Main entry point
var orchestrator_1 = require("./orchestrator");
Object.defineProperty(exports, "batchProcess", { enumerable: true, get: function () { return orchestrator_1.batchProcess; } });
// Low-level utilities
var split_1 = require("./split");
Object.defineProperty(exports, "tokenBasedSplit", { enumerable: true, get: function () { return split_1.tokenBasedSplit; } });
Object.defineProperty(exports, "itemBasedSplit", { enumerable: true, get: function () { return split_1.itemBasedSplit; } });
var merge_1 = require("./merge");
Object.defineProperty(exports, "hierarchicalMerge", { enumerable: true, get: function () { return merge_1.hierarchicalMerge; } });
