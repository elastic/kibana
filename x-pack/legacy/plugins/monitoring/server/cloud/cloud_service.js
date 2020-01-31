/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject, isString } from 'lodash';
import request from 'request';
import { CloudServiceResponse } from './cloud_response';

/**
 * {@code CloudService} provides a mechanism for cloud services to be checked for metadata
 * that may help to determine the best defaults and priorities.
 */
export class CloudService {
  constructor(name, options = {}) {
    this._name = name.toLowerCase();

    // Allow the HTTP handler to be swapped out for tests
    const { _request = request } = options;

    this._request = _request;
  }

  /**
   * Get the search-friendly name of the Cloud Service.
   *
   * @return {String} Never {@code null}.
   */
  getName() {
    return this._name;
  }

  /**
   * Using whatever mechanism is required by the current Cloud Service, determine
   * Kibana is running in it and return relevant metadata.
   *
   * @return {Promise} Never {@code null} {@code CloudServiceResponse}.
   */
  checkIfService() {
    return this._checkIfService(this._request).catch(() => this._createUnconfirmedResponse());
  }

  /**
   * Using whatever mechanism is required by the current Cloud Service, determine
   * Kibana is running in it and return relevant metadata.
   *
   * @param {Object} _request 'request' HTTP handler.
   * @return {Promise} Never {@code null} {@code CloudServiceResponse}.
   */
  _checkIfService(_request) {
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Create a new {@code CloudServiceResponse} that denotes that this cloud service is not being used by the current machine / VM.
   *
   * @return {CloudServiceResponse} Never {@code null}.
   */
  _createUnconfirmedResponse() {
    return CloudServiceResponse.unconfirmed(this._name);
  }

  /**
   * Strictly parse JSON.
   *
   * @param {String} value The string to parse as a JSON object
   * @return {Object} The result of {@code JSON.parse} if it's an object.
   * @throws {Error} if the {@code value} is not a String that can be converted into an Object
   */
  _stringToJson(value) {
    // note: this will throw an error if this is not a string
    value = value.trim();

    // we don't want to return scalar values, arrays, etc.
    if (value.startsWith('{') && value.endsWith('}')) {
      return JSON.parse(value);
    }

    throw new Error(`'${value}' is not a JSON object`);
  }

  /**
   * Convert the {@code response} to a JSON object and attempt to parse it using the {@code parseBody} function.
   *
   * If the {@code response} cannot be parsed as a JSON object, or if it fails to be useful, then {@code parseBody} should return
   * {@code null}.
   *
   * @param {Object} body The body from the response from the VM web service.
   * @param {Function} parseBody Single argument function that accepts parsed JSON body from the response.
   * @return {Promise} Never {@code null} {@code CloudServiceResponse} or rejection.
   */
  _parseResponse(body, parseBody) {
    // parse it if necessary
    if (isString(body)) {
      try {
        body = this._stringToJson(body);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    if (isObject(body)) {
      const response = parseBody(body);

      if (response) {
        return Promise.resolve(response);
      }
    }

    // use default handling
    return Promise.reject();
  }
}
