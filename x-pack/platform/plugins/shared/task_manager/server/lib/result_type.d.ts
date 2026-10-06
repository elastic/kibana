/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Ok<T> {
  tag: 'ok';
  value: T;
}
export interface Err<E> {
  tag: 'err';
  error: E;
}
export type Result<T, E> = Ok<T> | Err<E>;
export declare function asOk<T>(value: T): Ok<T>;
export declare function asErr<T>(error: T): Err<T>;
export declare function isOk<T, E>(result: Result<T, E>): result is Ok<T>;
export declare function isErr<T, E>(result: Result<T, E>): result is Err<E>;
export declare function tryAsResult<T, E>(fn: () => T): Result<T, E>;
export declare function promiseResult<T, E>(future: Promise<T>): Promise<Result<T, E>>;
export declare function unwrapPromise<T, E>(future: Promise<Result<T, E>>): Promise<T>;
export declare function unwrap<T, E>(result: Result<T, E>): T | E;
export declare function either<T, E>(
  result: Result<T, E>,
  onOk: (value: T) => void,
  onErr: (error: E) => void
): Result<T, E>;
export declare function eitherAsync<T, E>(
  result: Result<T, E>,
  onOk: (value: T) => Promise<void>,
  onErr: (error: E) => Promise<void>
): Promise<Result<T, E> | void>;
export declare function map<T, E, Resolution>(
  result: Result<T, E>,
  onOk: (value: T) => Resolution,
  onErr: (error: E) => Resolution
): Resolution;
export declare const mapR: (...args: any[]) => any;
export declare const mapOk: (...args: any[]) => any;
export declare const mapErr: (...args: any[]) => any;
