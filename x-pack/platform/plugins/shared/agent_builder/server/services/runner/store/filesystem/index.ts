/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { VirtualFileSystem } from './virtual_filesystem';
export { MemoryVolume } from './memory_volume';
export {
  type IVirtualFileSystem,
  type Volume,
  type MountOptions,
  type GlobOptions,
  type ListOptions,
  type VolumeGlobOptions,
} from './types';
