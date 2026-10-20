/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';

type Primitive = string | number | boolean | null | undefined | bigint;
export type CodecInput = Primitive | object;
export type WireValue =
  | { readonly kind: 'primitive'; readonly value: Exclude<Primitive, bigint> }
  | { readonly kind: 'bigint' | 'date' | 'bytes'; readonly value: string }
  | { readonly kind: 'duration' | 'byte_size'; readonly value: number }
  | { readonly kind: 'array'; readonly items: readonly WireValue[] }
  | { readonly kind: 'object'; readonly entries: ReadonlyArray<readonly [string, WireValue]> }
  | {
      readonly kind: 'error';
      readonly name: string;
      readonly message: string;
      readonly code?: string;
    };

const forbidden = new Set(['__proto__', 'constructor', 'prototype']);

/** Encodes explicit data; functions, cycles and unsupported class instances fail closed. */
export const encode = (value: CodecInput, parents = new Set<object>(), depth = 0): WireValue => {
  if (depth > 64) throw new Error('Capability codec depth limit');
  if (typeof value === 'bigint') return { kind: 'bigint', value: String(value) };
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol') {
      throw new Error('Use a module descriptor for contributed code and schemas');
    }
    return { kind: 'primitive', value };
  }
  if (value instanceof ByteSizeValue) return { kind: 'byte_size', value: value.getValueInBytes() };
  if (moment.isDuration(value)) return { kind: 'duration', value: value.asMilliseconds() };
  if (value instanceof Date) return { kind: 'date', value: value.toISOString() };
  if (value instanceof ArrayBuffer || Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const buffer = value instanceof ArrayBuffer ? Buffer.from(value) : Buffer.from(value);
    return { kind: 'bytes', value: buffer.toString('base64') };
  }
  if (value instanceof Error) {
    return {
      kind: 'error',
      name: value.name,
      message: value.message,
      ...('code' in value && typeof value.code === 'string' ? { code: value.code } : {}),
    };
  }
  if (parents.has(value)) throw new Error('Cyclic capability value');
  parents.add(value);
  try {
    if (Array.isArray(value))
      return {
        kind: 'array',
        items: value.map((item: CodecInput) => encode(item, parents, depth + 1)),
      };
    if (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    ) {
      throw new Error('Unsupported capability class; supply an explicit codec/module descriptor');
    }
    return {
      kind: 'object',
      entries: Object.keys(value).map((key) => {
        if (forbidden.has(key)) throw new Error('Unsafe capability key');
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor))
          throw new Error('Capability getters are not data');
        return [key, encode(descriptor.value as CodecInput, parents, depth + 1)] as const;
      }),
    };
  } finally {
    parents.delete(value);
  }
};

/** Restores the supported configuration classes without evaluating remote code. */
export const decode = (wire: WireValue, depth = 0): CodecInput => {
  if (depth > 64) throw new Error('Capability codec depth limit');
  switch (wire.kind) {
    case 'primitive':
      return wire.value;
    case 'bigint':
      return BigInt(wire.value);
    case 'date':
      return new Date(wire.value);
    case 'bytes':
      return Buffer.from(wire.value, 'base64');
    case 'duration':
      return moment.duration(wire.value);
    case 'byte_size':
      return new ByteSizeValue(wire.value);
    case 'array':
      return wire.items.map((item) => decode(item, depth + 1));
    case 'object': {
      const result: Record<string, CodecInput> = {};
      for (const [key, value] of wire.entries) {
        if (forbidden.has(key)) throw new Error('Unsafe capability key');
        result[key] = decode(value, depth + 1);
      }
      return result;
    }
    case 'error': {
      const error = new Error(wire.message);
      error.name = wire.name;
      if (wire.code) Object.assign(error, { code: wire.code });
      return error;
    }
    default:
      throw new Error('Unknown capability codec');
  }
};
