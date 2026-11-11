/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { BindingActivation } from 'inversify';
import { AuthService, type AuthRequirement, type AuthServiceContract } from './auth_service';

/** Marks a public method as callable without any alerting v2 feature privilege. */
export const UNRESTRICTED = 'unrestricted' as const;

/**
 * What a public method requires of the caller: a fixed feature privilege, one
 * derived from the call arguments, or none at all.
 */
export type AuthPolicy<TArgs extends unknown[] = unknown[]> =
  | AuthRequirement
  | ((...args: TArgs) => AuthRequirement)
  | typeof UNRESTRICTED;

/**
 * One policy per public method of `T`. Exhaustive by construction: adding a
 * public method without declaring its policy is a compile error. Only async
 * methods are supported because authorization is asynchronous.
 */
export type AuthPolicies<T> = {
  readonly [K in keyof PublicMethodsOf<T>]: PublicMethodsOf<T>[K] extends (
    ...args: infer TArgs
  ) => Promise<unknown>
    ? AuthPolicy<TArgs>
    : never;
};

const resolvePolicy = <T>(policies: AuthPolicies<T>, method: string): AuthPolicy | undefined =>
  Object.hasOwn(policies, method) ? Reflect.get(policies, method) : undefined;

const toRequirement = (policy: Exclude<AuthPolicy, typeof UNRESTRICTED>, args: unknown[]) =>
  typeof policy === 'function' ? policy(...args) : policy;

/**
 * Wraps `target` so every public method authorizes the caller per `policies`
 * before running. Calls run with `this` bound to the raw target, so a public
 * method calling another method internally is authorized once, at the entry
 * point. A function with no declared policy fails closed.
 */
export const withAuthorization = <T extends object>(
  target: T,
  authService: AuthServiceContract,
  policies: AuthPolicies<T>
): T =>
  new Proxy(target, {
    get(instance, property) {
      const value: unknown = Reflect.get(instance, property);
      if (
        typeof property === 'symbol' ||
        property === 'constructor' ||
        typeof value !== 'function'
      ) {
        return value;
      }

      const policy = resolvePolicy(policies, property);

      return async (...args: unknown[]): Promise<unknown> => {
        if (policy === undefined) {
          throw Boom.forbidden(`No authorization policy is declared for "${property}"`);
        }
        if (policy !== UNRESTRICTED) {
          await authService.ensureAuthorized(toRequirement(policy, args));
        }
        return value.apply(instance, args);
      };
    },
  });

/**
 * Inversify activation that guards a request-scoped client with `policies`,
 * resolving the `AuthService` from the same request scope.
 */
export const authorizedActivation =
  <T extends object>(policies: AuthPolicies<T>): BindingActivation<T> =>
  (context, instance) =>
    withAuthorization(instance, context.get(AuthService), policies);
