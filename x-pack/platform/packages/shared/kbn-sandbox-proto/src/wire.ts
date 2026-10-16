/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Minimal protobuf wire-format primitives: plain Buffer manipulation, no eval and no code
// generation. Integers are JS numbers, exact up to Number.MAX_SAFE_INTEGER.

const WIRE_VARINT = 0;
const WIRE_FIXED64 = 1;
const WIRE_LENGTH_DELIMITED = 2;
const WIRE_FIXED32 = 5;

const TWO_POW_32 = 2 ** 32;
const TWO_POW_64 = BigInt(2) ** BigInt(64);
const MAX_VARINT_BYTES = 10;
// Each varint byte carries 7 bits. Arithmetic instead of bitwise ops keeps 64-bit values exact.
const VARINT_BASE = BigInt(0x80);

const encodeVarint = (value: number): Buffer => {
  // Negative int32/int64 values are encoded as their 64-bit two's complement.
  let remaining = BigInt(Math.trunc(value));
  if (remaining < BigInt(0)) {
    remaining += TWO_POW_64;
  }
  const bytes: number[] = [];
  while (remaining >= VARINT_BASE) {
    bytes.push(Number(remaining % VARINT_BASE) + 0x80);
    remaining /= VARINT_BASE;
  }
  bytes.push(Number(remaining));
  return Buffer.from(bytes);
};

// Varints are decoded as 64-bit two's complement, so negative int32/int64 values come back
// negative. Values beyond Number.MAX_SAFE_INTEGER lose precision.
const decodeVarint = (buf: Buffer, offset: number): { value: number; bytesRead: number } => {
  let value = BigInt(0);
  let multiplier = BigInt(1);
  let bytesRead = 0;
  while (true) {
    if (offset + bytesRead >= buf.length) {
      throw new Error('truncated varint');
    }
    if (bytesRead >= MAX_VARINT_BYTES) {
      throw new Error('varint too long');
    }
    const byte = buf[offset + bytesRead];
    bytesRead++;
    value += BigInt(byte % 0x80) * multiplier;
    multiplier *= VARINT_BASE;
    if (byte < 0x80) {
      return { value: Number(BigInt.asIntN(64, value)), bytesRead };
    }
  }
};

const encodeTag = (field: number, wireType: number): Buffer => encodeVarint(field * 8 + wireType);

/** A single decoded protobuf field. Length-delimited payloads are sub-buffers of the input. */
export type ProtoField =
  | { readonly field: number; readonly wireType: typeof WIRE_VARINT; readonly value: number }
  | {
      readonly field: number;
      readonly wireType: typeof WIRE_LENGTH_DELIMITED;
      readonly value: Buffer;
    }
  | { readonly field: number; readonly wireType: typeof WIRE_FIXED64; readonly value: Buffer }
  | { readonly field: number; readonly wireType: typeof WIRE_FIXED32; readonly value: Buffer };

/** Iterates over the top-level fields of an encoded protobuf message. */
export function* readFields(buf: Buffer): Generator<ProtoField> {
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, bytesRead } = decodeVarint(buf, offset);
    offset += bytesRead;
    const field = Math.floor(tag / 8);
    const wireType = tag % 8;
    if (wireType === WIRE_VARINT) {
      const varint = decodeVarint(buf, offset);
      offset += varint.bytesRead;
      yield { field, wireType, value: varint.value };
    } else if (wireType === WIRE_LENGTH_DELIMITED) {
      const length = decodeVarint(buf, offset);
      offset += length.bytesRead;
      const end = offset + length.value;
      if (end > buf.length) {
        throw new Error('truncated length-delimited field');
      }
      yield { field, wireType, value: buf.subarray(offset, end) };
      offset = end;
    } else if (wireType === WIRE_FIXED64) {
      yield { field, wireType, value: buf.subarray(offset, offset + 8) };
      offset += 8;
    } else if (wireType === WIRE_FIXED32) {
      yield { field, wireType, value: buf.subarray(offset, offset + 4) };
      offset += 4;
    } else {
      throw new Error(`unsupported protobuf wire type ${wireType}`);
    }
  }
}

/** Interprets a decoded varint as a signed 32-bit integer (proto `int32`). */
export const toInt32 = (value: number): number => {
  const low = value % TWO_POW_32;
  return low >= 2 ** 31 ? low - TWO_POW_32 : low;
};

/** Decodes a proto `double` from a fixed64 field. */
export const readDouble = (value: Buffer): number => value.readDoubleLE(0);

/** Decodes the values of a repeated varint field, which proto3 encodes packed by default. */
export const readPackedVarints = (field: ProtoField): number[] => {
  if (field.wireType === WIRE_VARINT) {
    return [field.value];
  }
  if (field.wireType !== WIRE_LENGTH_DELIMITED) {
    return [];
  }
  const values: number[] = [];
  let offset = 0;
  while (offset < field.value.length) {
    const { value, bytesRead } = decodeVarint(field.value, offset);
    values.push(value);
    offset += bytesRead;
  }
  return values;
};

/** Builds an encoded protobuf message. proto3 default values are omitted, as the spec requires. */
export class ProtoWriter {
  private readonly parts: Buffer[] = [];

  string(field: number, value: string | undefined): this {
    if (value) {
      this.bytes(field, Buffer.from(value, 'utf8'));
    }
    return this;
  }

  /** Writes a length-delimited field even when empty (used for repeated and explicit fields). */
  bytes(field: number, value: Buffer): this {
    this.parts.push(encodeTag(field, WIRE_LENGTH_DELIMITED), encodeVarint(value.length), value);
    return this;
  }

  /** Writes a non-empty `bytes` field (proto3 omits empty scalars). */
  optionalBytes(field: number, value: Buffer | undefined): this {
    if (value && value.length > 0) {
      this.bytes(field, value);
    }
    return this;
  }

  varint(field: number, value: number | undefined): this {
    if (value) {
      this.parts.push(encodeTag(field, WIRE_VARINT), encodeVarint(value));
    }
    return this;
  }

  bool(field: number, value: boolean | undefined): this {
    return this.varint(field, value ? 1 : 0);
  }

  double(field: number, value: number | undefined): this {
    if (value) {
      const payload = Buffer.allocUnsafe(8);
      payload.writeDoubleLE(value, 0);
      this.parts.push(encodeTag(field, WIRE_FIXED64), payload);
    }
    return this;
  }

  message(field: number, value: ProtoWriter): this {
    return this.bytes(field, value.finish());
  }

  stringMap(field: number, map: Record<string, string> | undefined): this {
    for (const [key, value] of Object.entries(map ?? {})) {
      this.message(field, new ProtoWriter().string(1, key).string(2, value));
    }
    return this;
  }

  packedVarints(field: number, values: readonly number[]): this {
    if (values.length > 0) {
      this.bytes(field, Buffer.concat(values.map(encodeVarint)));
    }
    return this;
  }

  finish(): Buffer {
    return Buffer.concat(this.parts);
  }
}
