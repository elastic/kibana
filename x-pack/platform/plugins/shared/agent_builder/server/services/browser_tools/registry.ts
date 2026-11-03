/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDescriptor } from '@kbn/agent-builder-common';

const VALID_ID = /^[a-zA-Z0-9_-]+$/;

export class BrowserToolDescriptorRegistry {
  private readonly descriptors = new Map<string, BrowserToolDescriptor>();

  register(descriptor: BrowserToolDescriptor): void {
    const { id } = descriptor;
    if (id.includes('.') || !VALID_ID.test(id)) {
      throw new Error(
        `Invalid browser tool id "${id}": ids must not contain "." and must match ${VALID_ID}`
      );
    }
    if (this.descriptors.has(id)) {
      throw new Error(`Browser tool "${id}" is already registered`);
    }
    this.descriptors.set(id, descriptor);
  }

  has(id: string): boolean {
    return this.descriptors.has(id);
  }

  get(id: string): BrowserToolDescriptor | undefined {
    return this.descriptors.get(id);
  }

  list(): BrowserToolDescriptor[] {
    return [...this.descriptors.values()];
  }
}

export const createBrowserToolDescriptorRegistry = ({
  seed = [],
}: { seed?: BrowserToolDescriptor[] } = {}): BrowserToolDescriptorRegistry => {
  const registry = new BrowserToolDescriptorRegistry();
  seed.forEach((descriptor) => registry.register(descriptor));
  return registry;
};
