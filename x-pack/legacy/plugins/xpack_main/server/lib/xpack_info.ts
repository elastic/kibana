/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { Legacy } from 'kibana';

import { XPackInfoLicense } from './xpack_info_license';

import { LicensingPluginSetup, ILicense } from '../../../../../plugins/licensing/server';

export interface XPackInfoOptions {
  clusterSource?: string;
  pollFrequencyInMillis: number;
}

type LicenseGeneratorCheck = (xpackInfo: XPackInfo) => any;

export interface XPackFeature {
  isAvailable(): boolean;
  isEnabled(): boolean;
  registerLicenseCheckResultsGenerator(generator: LicenseGeneratorCheck): void;
  getLicenseCheckResults(): any;
}

interface Deps {
  licensing: LicensingPluginSetup;
}

/**
 * A helper that provides a convenient way to access XPack Info returned by Elasticsearch.
 */
export class XPackInfo {
  /**
   * XPack License object.
   * @type {XPackInfoLicense}
   * @private
   */
  _license: XPackInfoLicense;

  /**
   * Feature name <-> feature license check generator function mapping.
   * @type {Map<string, Function>}
   * @private
   */
  _featureLicenseCheckResultsGenerators = new Map<string, LicenseGeneratorCheck>();

  /**
   * Set of listener functions that will be called whenever the license
   * info changes
   * @type {Set<Function>}
   */
  _licenseInfoChangedListeners = new Set<() => void>();

  /**
   * Cache that may contain last xpack info API response or error, json representation
   * of xpack info and xpack info signature.
   * @type {{response: Object|undefined, error: Object|undefined, json: Object|undefined, signature: string|undefined}}
   * @private
   */
  private _cache: {
    license?: ILicense;
    error?: string;
    json?: Record<string, any>;
    signature?: string;
  };

  /**
   * XPack License instance.
   * @returns {XPackInfoLicense}
   */
  public get license() {
    return this._license;
  }

  private readonly licensingPlugin: LicensingPluginSetup;

  /**
   * Constructs XPack info object.
   * @param {Hapi.Server} server HapiJS server instance.
   */
  constructor(server: Legacy.Server, deps: Deps) {
    if (!deps.licensing) {
      throw new Error('XPackInfo requires enabled Licensing plugin');
    }
    this.licensingPlugin = deps.licensing;

    this._cache = {};

    this.licensingPlugin.license$.subscribe((license: ILicense) => {
      if (license.isActive) {
        this._cache = {
          license,
          error: undefined,
        };
      } else {
        this._cache = {
          license,
          error: license.error,
        };
      }

      this._licenseInfoChangedListeners.forEach((fn) => fn());
    });

    this._license = new XPackInfoLicense(() => this._cache.license);
  }

  /**
   * Checks whether XPack info is available.
   * @returns {boolean}
   */
  isAvailable() {
    return Boolean(this._cache.license?.isAvailable);
  }

  /**
   * Checks whether ES was available
   * @returns {boolean}
   */
  isXpackUnavailable() {
    return (
      this._cache.error &&
      this._cache.error === 'X-Pack plugin is not installed on the Elasticsearch cluster.'
    );
  }

  /**
   * If present, describes the reason why XPack info is not available.
   * @returns {Error|string}
   */
  unavailableReason() {
    return this._cache.license?.getUnavailableReason();
  }

  onLicenseInfoChange(handler: () => void) {
    this._licenseInfoChangedListeners.add(handler);
  }

  /**
   * Queries server to get the updated XPack info.
   * @returns {Promise.<XPackInfo>}
   */
  async refreshNow() {
    await this.licensingPlugin.refresh();
    return this;
  }

  /**
   * Returns a wrapper around XPack info that gives an access to the properties of
   * the specific feature.
   * @param {string} name Name of the feature to get a wrapper for.
   * @returns {Object}
   */
  feature(name: string): XPackFeature {
    return {
      /**
       * Checks whether feature is available (permitted by the current license).
       * @returns {boolean}
       */
      isAvailable: () => {
        return Boolean(this._cache.license?.getFeature(name).isAvailable);
      },

      /**
       * Checks whether feature is enabled (not disabled by the configuration specifically).
       * @returns {boolean}
       */
      isEnabled: () => {
        return Boolean(this._cache.license?.getFeature(name).isEnabled);
      },

      /**
       * Registers a `generator` function that will be called with XPackInfo instance as
       * argument whenever XPack info changes. Whatever `generator` returns will be stored
       * in XPackInfo JSON representation and can be accessed with `getLicenseCheckResults`.
       * @param {Function} generator Function to call whenever XPackInfo changes.
       */
      registerLicenseCheckResultsGenerator: (generator: LicenseGeneratorCheck) => {
        this._featureLicenseCheckResultsGenerators.set(name, generator);

        // Since JSON representation and signature are cached we should invalidate them to
        // include results from newly registered generator when they are requested.
        this._cache.json = undefined;
        this._cache.signature = undefined;
      },

      /**
       * Returns license check results that were previously produced by the `generator` function.
       * @returns {Object}
       */
      getLicenseCheckResults: () => this.toJSON().features[name],
    };
  }

  /**
   * Extracts string md5 hash from the stringified version of license JSON representation.
   * @returns {string}
   */
  getSignature() {
    if (this._cache.signature) {
      return this._cache.signature;
    }

    this._cache.signature = createHash('md5').update(JSON.stringify(this.toJSON())).digest('hex');

    return this._cache.signature;
  }

  /**
   * Returns JSON representation of the license object that is suitable for serialization.
   * @returns {Object}
   */
  toJSON() {
    if (this._cache.json) {
      return this._cache.json;
    }

    this._cache.json = {
      license: {
        type: this.license.getType(),
        isActive: this.license.isActive(),
        expiryDateInMillis: this.license.getExpiryDateInMillis(),
      },
      features: {},
    };

    // Set response elements specific to each feature. To do this,
    // call the license check results generator for each feature, passing them
    // the xpack info object
    for (const [feature, licenseChecker] of this._featureLicenseCheckResultsGenerators) {
      // return value expected to be a dictionary object.
      this._cache.json.features[feature] = licenseChecker(this);
    }

    return this._cache.json;
  }
}
