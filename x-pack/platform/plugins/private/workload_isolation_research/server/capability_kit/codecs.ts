/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import { encodeError, decodeError } from './error_codecs';
import type { EncodedError } from './error_codecs';

type Primitive = string | number | boolean | null | undefined | bigint;
export type CodecInput = Primitive | object;
export type WireValue =
  | { readonly kind: 'primitive'; readonly value: Exclude<Primitive, bigint> }
  | {
      readonly kind:
        | 'bigint'
        | 'date'
        | 'bytes'
        | 'duration'
        | 'number'
        | 'url'
        | 'url_params'
        | 'array_buffer';
      readonly value: string;
    }
  | { readonly kind: 'view'; readonly type: string; readonly value: string }
  | {
      readonly kind: 'regexp';
      readonly source: string;
      readonly flags: string;
      readonly lastIndex: number;
    }
  | { readonly kind: 'map'; readonly entries: ReadonlyArray<readonly [WireValue, WireValue]> }
  | { readonly kind: 'set'; readonly items: readonly WireValue[] }
  | { readonly kind: 'byte_size'; readonly value: number }
  | { readonly kind: 'array'; readonly items: readonly WireValue[] }
  | { readonly kind: 'object'; readonly entries: ReadonlyArray<readonly [string, WireValue]> }
  | EncodedError;

const forbidden = new Set(['__proto__', 'constructor', 'prototype']);

/** Encodes explicit data; functions, cycles and unsupported class instances fail closed. */
export const encode = (value: CodecInput, parents = new Set<object>(), depth = 0): WireValue => {
  if (depth > 64) throw new Error('Capability codec depth limit');
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0)))
    return { kind: 'number', value: Object.is(value, -0) ? '-0' : String(value) };
  if (typeof value === 'bigint') return { kind: 'bigint', value: String(value) };
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol') {
      throw new Error('Use a module descriptor for contributed code and schemas');
    }
    return { kind: 'primitive', value };
  }
  if (value instanceof ByteSizeValue) return { kind: 'byte_size', value: value.getValueInBytes() };
  if (moment.isDuration(value)) return { kind: 'duration', value: value.toISOString() };
  if (value instanceof Date) return { kind: 'date', value: value.toISOString() };
  if (value instanceof URL) return { kind: 'url', value: value.toString() };
  if (value instanceof URLSearchParams) return { kind: 'url_params', value: value.toString() };
  if (value instanceof RegExp)
    return { kind: 'regexp', source: value.source, flags: value.flags, lastIndex: value.lastIndex };
  if (Buffer.isBuffer(value)) return { kind: 'bytes', value: value.toString('base64') };
  if (value instanceof ArrayBuffer)
    return { kind: 'array_buffer', value: Buffer.from(value).toString('base64') };
  if (ArrayBuffer.isView(value))
    return {
      kind: 'view',
      type: Object.prototype.toString.call(value).slice(8, -1),
      value: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64'),
    };
  if (parents.has(value)) throw new Error('Cyclic capability value');
  parents.add(value);
  try {
    if (value instanceof Error)
      return encodeError(value, (item) => encode(item, parents, depth + 1));
    if (value instanceof Map)
      return {
        kind: 'map',
        entries: [...value.entries()].map(
          ([key, item]) =>
            [
              encode(key as CodecInput, parents, depth + 1),
              encode(item as CodecInput, parents, depth + 1),
            ] as const
        ),
      };
    if (value instanceof Set)
      return {
        kind: 'set',
        items: [...value].map((item) => encode(item as CodecInput, parents, depth + 1)),
      };
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
    case 'number':
      return wire.value === '-0' ? -0 : Number(wire.value);
    case 'url':
      return new URL(wire.value);
    case 'url_params':
      return new URLSearchParams(wire.value);
    case 'regexp': {
      const value = new RegExp(wire.source, wire.flags);
      value.lastIndex = wire.lastIndex;
      return value;
    }
    case 'map':
      return new Map(
        wire.entries.map(([key, value]) => [decode(key, depth + 1), decode(value, depth + 1)])
      );
    case 'set':
      return new Set(wire.items.map((item) => decode(item, depth + 1)));
    case 'array_buffer':
      return Uint8Array.from(Buffer.from(wire.value, 'base64')).buffer;
    case 'view': {
      const buffer = Uint8Array.from(Buffer.from(wire.value, 'base64')).buffer;
      switch (wire.type) {
        case 'DataView':
          return new DataView(buffer);
        case 'Int8Array':
          return new Int8Array(buffer);
        case 'Uint8Array':
          return new Uint8Array(buffer);
        case 'Uint8ClampedArray':
          return new Uint8ClampedArray(buffer);
        case 'Int16Array':
          return new Int16Array(buffer);
        case 'Uint16Array':
          return new Uint16Array(buffer);
        case 'Int32Array':
          return new Int32Array(buffer);
        case 'Uint32Array':
          return new Uint32Array(buffer);
        case 'Float32Array':
          return new Float32Array(buffer);
        case 'Float64Array':
          return new Float64Array(buffer);
        case 'BigInt64Array':
          return new BigInt64Array(buffer);
        case 'BigUint64Array':
          return new BigUint64Array(buffer);
        default:
          throw new Error('Unsupported typed view');
      }
    }
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
    case 'error':
      return decodeError(wire, (item) => decode(item, depth + 1));
    default:
      throw new Error('Unknown capability codec');
  }
};
