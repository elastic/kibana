/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import moment from 'moment';
import { get, has } from 'lodash';
import { Poller } from '../../../../common/poller';
import { XPackInfoLicense } from './xpack_info_license';

/**
 * A helper that provides a convenient way to access XPack Info returned by Elasticsearch.
 */
export class XPackInfo {
  /**
   * XPack License object.
   * @type {XPackInfoLicense}
   * @private
   */
  _license;

  /**
   * Feature name <-> feature license check generator function mapping.
   * @type {Map<string, Function>}
   * @private
   */
  _featureLicenseCheckResultsGenerators = new Map();


  /**
   * Set of listener functions that will be called whenever the license
   * info changes
   * @type {Set<Function>}
   */
  _licenseInfoChangedListeners = new Set();


  /**
   * Cache that may contain last xpack info API response or error, json representation
   * of xpack info and xpack info signature.
   * @type {{response: Object|undefined, error: Object|undefined, json: Object|undefined, signature: string|undefined}}
   * @private
   */
  _cache = {};

  /**
   * XPack info poller.
   * @type {Poller}
   * @private
   */
  _poller;

  /**
   * XPack License instance.
   * @returns {XPackInfoLicense}
   */
  get license() {
    return this._license;
  }

  /**
   * Constructs XPack info object.
   * @param {Hapi.Server} server HapiJS server instance.
   * @param {Object} options
   * @property {string} [options.clusterSource] Type of the cluster that should be used
   * to fetch XPack info (data, monitoring etc.). If not provided, `data` is used.
   * @property {number} options.pollFrequencyInMillis Polling interval used to automatically
   * refresh XPack Info by the internal poller.
   */
  constructor(server, { clusterSource = 'data', pollFrequencyInMillis }) {
    this._log = server.log.bind(server);
    this._cluster = server.plugins.elasticsearch.getCluster(clusterSource);
    this._clusterSource = clusterSource;

    // Create a poller that will be (re)started inside of the `refreshNow` call.
    this._poller = new Poller({
      functionToPoll: () => this.refreshNow(),
      trailing: true,
      pollFrequencyInMillis,
      continuePollingOnError: true
    });

    server.events.on('stop', () => {
      this._poller.stop();
    });

    this._license = new XPackInfoLicense(
      () => this._cache.response && this._cache.response.license
    );
  }

  /**
   * Checks whether XPack info is available.
   * @returns {boolean}
   */
  isAvailable() {
    return !!this._cache.response && !!this._cache.response.license;
  }

  /**
   * Checks whether ES was available
   * @returns {boolean}
   */
  isXpackUnavailable() {
    return this._cache.error instanceof Error && this._cache.error.status === 400;
  }

  /**
   * If present, describes the reason why XPack info is not available.
   * @returns {Error|string}
   */
  unavailableReason() {
    if (!this._cache.error && this._cache.response && !this._cache.response.license) {
      return `[${this._clusterSource}] Elasticsearch cluster did not respond with license information.`;
    }

    if (this.isXpackUnavailable()) {
      return `X-Pack plugin is not installed on the [${this._clusterSource}] Elasticsearch cluster.`;
    }

    return this._cache.error;
  }

  onLicenseInfoChange(handler) {
    this._licenseInfoChangedListeners.add(handler);
  }

  /**
   * Queries server to get the updated XPack info.
   * @returns {Promise.<XPackInfo>}
   */
  async refreshNow() {
    this._log(['license', 'debug', 'xpack'], (
      `Calling [${this._clusterSource}] Elasticsearch _xpack API. Polling frequency: ${this._poller.getPollFrequency()}`
    ));

    // We can reset polling timer since we force refresh here.
    this._poller.stop();

    try {
      const response = await this._cluster.callWithInternalUser('transport.request', {
        method: 'GET',
        path: '/_xpack'
      });

      const licenseInfoChanged = this._hasLicenseInfoChanged(response);

      if (licenseInfoChanged) {
        const licenseInfoParts = [
          `mode: ${get(response, 'license.mode')}`,
          `status: ${get(response, 'license.status')}`,
        ];

        if (has(response, 'license.expiry_date_in_millis')) {
          const expiryDate = moment(response.license.expiry_date_in_millis, 'x').format();
          licenseInfoParts.push(`expiry date: ${expiryDate}`);
        }

        const licenseInfo = licenseInfoParts.join(' | ');

        this._log(
          ['license', 'info', 'xpack'],
          `Imported ${this._cache.response ? 'changed ' : ''}license information` +
          ` from Elasticsearch for the [${this._clusterSource}] cluster: ${licenseInfo}`
        );
      }

      this._cache = { response };

      if (licenseInfoChanged) {
        // call license info changed listeners
        for (const listener of this._licenseInfoChangedListeners) {
          listener();
        }
      }

    } catch(error) {
      this._log(
        ['license', 'warning', 'xpack'],
        `License information from the X-Pack plugin could not be obtained from Elasticsearch` +
        ` for the [${this._clusterSource}] cluster. ${error}`
      );

      this._cache = { error };
    }

    this._poller.start();

    return this;
  }

  /**
   * Returns a wrapper around XPack info that gives an access to the properties of
   * the specific feature.
   * @param {string} name Name of the feature to get a wrapper for.
   * @returns {Object}
   */
  feature(name) {
    return {
      /**
       * Checks whether feature is available (permitted by the current license).
       * @returns {boolean}
       */
      isAvailable: () => {
        return !!get(this._cache.response, `features.${name}.available`);
      },

      /**
       * Checks whether feature is enabled (not disabled by the configuration specifically).
       * @returns {boolean}
       */
      isEnabled: () => {
        return !!get(this._cache.response, `features.${name}.enabled`);
      },

      /**
       * Registers a `generator` function that will be called with XPackInfo instance as
       * argument whenever XPack info changes. Whatever `generator` returns will be stored
       * in XPackInfo JSON representation and can be accessed with `getLicenseCheckResults`.
       * @param {Function} generator Function to call whenever XPackInfo changes.
       */
      registerLicenseCheckResultsGenerator: (generator) => {
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
      getLicenseCheckResults: () => this.toJSON().features[name]
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

    this._cache.signature = createHash('md5')
      .update(JSON.stringify(this.toJSON()))
      .digest('hex');

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
        expiryDateInMillis: this.license.getExpiryDateInMillis()
      },
      features: {}
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

  /**
   * Checks whether license within specified response differs from the current license.
   * Comparison is based on license mode, status and expiration date.
   * @param {Object} response xPack info response object returned from the backend.
   * @returns {boolean} True if license within specified response object differs from
   * the one we already have.
   * @private
   */
  _hasLicenseInfoChanged(response) {
    const newLicense = get(response, 'license') || {};
    const cachedLicense = get(this._cache.response, 'license') || {};

    if (newLicense.mode !== cachedLicense.mode) {
      return true;
    }

    if (newLicense.status !== cachedLicense.status) {
      return true;
    }

    return newLicense.expiry_date_in_millis !== cachedLicense.expiry_date_in_millis;
  }
}
