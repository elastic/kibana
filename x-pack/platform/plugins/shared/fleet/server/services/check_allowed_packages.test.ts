/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetUnauthorizedError } from '../errors';

import { checkAllowedPackages } from './check_allowed_packages';

describe('#checkAllowedPackages', () => {
  it('does not throw if no packages', () => {
    expect(() => checkAllowedPackages([], [])).not.toThrowError(FleetUnauthorizedError);
  });

  it('does not throw if allowedPackages is undefined', () => {
    expect(() => checkAllowedPackages([])).not.toThrowError(FleetUnauthorizedError);
  });

  it('throws if allowedPackages is empty array', () => {
    expect(() => checkAllowedPackages([{ name: 'packageA' }], [], 'name')).toThrowError(
      new FleetUnauthorizedError(
        'Authorization denied due to lack of integration package privileges'
      )
    );
  });

  it('does not throw if all packages allowed', () => {
    const packages = ['packageA', 'packageB', 'packageC'];
    const allowedPackages = ['packageA', 'packageB', 'packageC'];
    expect(() => checkAllowedPackages(packages, allowedPackages)).not.toThrowError(
      FleetUnauthorizedError
    );
  });

  it('throws if contains unresolved package', () => {
    const packages = [{ name: 'packageA' }, { name: 'packageB' }, { name: undefined }];
    const allowedPackages = ['packageA', 'packageB', 'packageC'];
    expect(() => checkAllowedPackages(packages, allowedPackages, 'name')).toThrowError(
      new FleetUnauthorizedError(
        'Authorization denied. Allowed package(s): packageA, packageB, packageC.'
      )
    );
  });

  it('throws if contains restricted packages', () => {
    const packages = [{ name: 'packageA' }, { name: 'packageB' }, { name: 'packageC' }];
    const allowedPackages = ['packageA', 'packageB'];
    expect(() => checkAllowedPackages(packages, allowedPackages, 'name')).toThrowError(
      new FleetUnauthorizedError(
        'Authorization denied to package: packageC. Allowed package(s): packageA, packageB'
      )
    );
  });
});
