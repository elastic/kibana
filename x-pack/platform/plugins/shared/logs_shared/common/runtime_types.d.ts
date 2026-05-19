import type { RouteValidationFunction } from '@kbn/core/server';
import { createPlainError, decodeOrThrow, formatErrors, throwErrors } from '@kbn/io-ts-utils';
import type { Type } from 'io-ts';
export { createPlainError, decodeOrThrow, formatErrors, throwErrors };
export declare const createValidationFunction: <DecodedValue, EncodedValue, InputValue>(runtimeType: Type<DecodedValue, EncodedValue, InputValue>) => RouteValidationFunction<DecodedValue>;
