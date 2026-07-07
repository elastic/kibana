/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateKafkaHost, validateLogstashHost } from './output';

describe('Output model', () => {
  describe('validateLogstashHost', () => {
    it('should support valid host', () => {
      expect(validateLogstashHost('test.fr:5044')).toBeUndefined();
    });

    it('should support valid host with uppercase letters', () => {
      expect(validateLogstashHost('tEsT.fr:5044')).toBeUndefined();
    });

    it('should return an error for an invalid host', () => {
      expect(validateLogstashHost('!@#%&!#!@')).toMatchInlineSnapshot(`"Invalid Logstash host"`);
    });

    it('should return an error for an invalid host with http scheme', () => {
      expect(validateLogstashHost('https://test.fr:5044')).toMatchInlineSnapshot(
        `"Host address must begin with a domain name or IP address"`
      );
    });
  });

  describe('validateKafkaHost', () => {
    it('should support valid host', () => {
      expect(validateKafkaHost('test.fr:5044')).toBeUndefined();
    });

    it('should return an error for an invalid host', () => {
      expect(validateKafkaHost('!@#%&!#!@')).toBe(
        'Invalid format. Expected "host:port" without protocol'
      );
    });

    it('should return an error for an invalid host with http scheme', () => {
      expect(validateKafkaHost('https://test.fr:5044')).toBe(
        'Invalid format. Expected "host:port" without protocol'
      );
    });
  });
});
