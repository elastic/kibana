/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { kafkaAuthType, kafkaConnectionType } from '../../../common/constants';

import {
  validateKafkaHost,
  validateLogstashHost,
  ElasticSearchSchema,
  LogstashSchema,
  KafkaSchema,
  RemoteElasticSearchSchema,
  UpdateOutputSchema,
} from './output';

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

  describe('hosts array size limits', () => {
    describe('ElasticSearchSchema', () => {
      it('should not throw for 11 hosts', () => {
        const hosts = Array.from({ length: 11 }, (_, i) => `https://es${i}.example.com:9200`);

        expect(() => {
          schema.object(ElasticSearchSchema).validate({
            name: 'test-es-output',
            type: 'elasticsearch',
            hosts,
          });
        }).not.toThrow();
      });

      it('should throw for 101 hosts', () => {
        const hosts = Array.from({ length: 101 }, (_, i) => `https://es${i}.example.com:9200`);

        expect(() => {
          schema.object(ElasticSearchSchema).validate({
            name: 'test-es-output',
            type: 'elasticsearch',
            hosts,
          });
        }).toThrow();
      });
    });

    describe('LogstashSchema', () => {
      it('should not throw for 11 hosts', () => {
        const hosts = Array.from({ length: 11 }, (_, i) => `es${i}.example.com:5044`);

        expect(() => {
          schema.object(LogstashSchema).validate({
            name: 'test-logstash-output',
            type: 'logstash',
            hosts,
          });
        }).not.toThrow();
      });

      it('should throw for 101 hosts', () => {
        const hosts = Array.from({ length: 101 }, (_, i) => `es${i}.example.com:5044`);

        expect(() => {
          schema.object(LogstashSchema).validate({
            name: 'test-logstash-output',
            type: 'logstash',
            hosts,
          });
        }).toThrow();
      });
    });

    describe('KafkaSchema', () => {
      it('should not throw for 11 hosts', () => {
        const hosts = Array.from({ length: 11 }, (_, i) => `es${i}.example.com:9092`);

        expect(() => {
          schema.object(KafkaSchema).validate({
            name: 'test-kafka-output',
            type: 'kafka',
            hosts,
            auth_type: kafkaAuthType.None,
            connection_type: kafkaConnectionType.Plaintext,
          });
        }).not.toThrow();
      });

      it('should throw for 101 hosts', () => {
        const hosts = Array.from({ length: 101 }, (_, i) => `es${i}.example.com:9092`);

        expect(() => {
          schema.object(KafkaSchema).validate({
            name: 'test-kafka-output',
            type: 'kafka',
            hosts,
            auth_type: kafkaAuthType.None,
            connection_type: kafkaConnectionType.Plaintext,
          });
        }).toThrow();
      });
    });

    describe('update payloads (UpdateOutputSchema)', () => {
      // UpdateOutputSchema is schema.oneOf over the four private *UpdateSchema variants.
      // Every field on those variants is optional, so `type` must be set to the
      // literal for the variant under test — otherwise a payload could validate
      // against the wrong branch (or several) and a passing assertion would prove
      // nothing about that variant's own hosts limit.
      describe('elasticsearch', () => {
        it('should not throw for 11 hosts', () => {
          const hosts = Array.from({ length: 11 }, (_, i) => `https://es${i}.example.com:9200`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'elasticsearch', hosts });
          }).not.toThrow();
        });

        it('should throw for 101 hosts', () => {
          const hosts = Array.from({ length: 101 }, (_, i) => `https://es${i}.example.com:9200`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'elasticsearch', hosts });
          }).toThrow();
        });
      });

      describe('logstash', () => {
        it('should not throw for 11 hosts', () => {
          const hosts = Array.from({ length: 11 }, (_, i) => `es${i}.example.com:5044`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'logstash', hosts });
          }).not.toThrow();
        });

        it('should throw for 101 hosts', () => {
          const hosts = Array.from({ length: 101 }, (_, i) => `es${i}.example.com:5044`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'logstash', hosts });
          }).toThrow();
        });
      });

      describe('remote_elasticsearch', () => {
        it('should not throw for 11 hosts', () => {
          const hosts = Array.from({ length: 11 }, (_, i) => `https://es${i}.example.com:9200`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'remote_elasticsearch', hosts });
          }).not.toThrow();
        });

        it('should throw for 101 hosts', () => {
          const hosts = Array.from({ length: 101 }, (_, i) => `https://es${i}.example.com:9200`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'remote_elasticsearch', hosts });
          }).toThrow();
        });
      });

      describe('kafka', () => {
        // Unlike the other three variants, KafkaUpdateSchema re-requires `name`:
        // it spreads `...UpdateSchema` (name optional) followed by `...KafkaSchema`,
        // whose own `...BaseSchema` spread carries a required `name`. Only `type`,
        // `hosts`, and `auth_type` are explicitly re-loosened afterwards, so `name`
        // must be supplied here or the assertion below would fail for the wrong
        // reason (a missing required field, not the hosts limit).
        it('should not throw for 11 hosts', () => {
          const hosts = Array.from({ length: 11 }, (_, i) => `es${i}.example.com:9092`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'kafka', name: 'test-kafka-output', hosts });
          }).not.toThrow();
        });

        it('should throw for 101 hosts', () => {
          const hosts = Array.from({ length: 101 }, (_, i) => `es${i}.example.com:9092`);

          expect(() => {
            UpdateOutputSchema.validate({ type: 'kafka', name: 'test-kafka-output', hosts });
          }).toThrow();
        });
      });
    });

    describe('RemoteElasticSearchSchema', () => {
      it('should not throw for 11 hosts', () => {
        const hosts = Array.from({ length: 11 }, (_, i) => `https://es${i}.example.com:9200`);

        expect(() => {
          schema.object(RemoteElasticSearchSchema).validate({
            name: 'test-remote-es-output',
            type: 'remote_elasticsearch',
            hosts,
          });
        }).not.toThrow();
      });

      it('should throw for 101 hosts', () => {
        const hosts = Array.from({ length: 101 }, (_, i) => `https://es${i}.example.com:9200`);

        expect(() => {
          schema.object(RemoteElasticSearchSchema).validate({
            name: 'test-remote-es-output',
            type: 'remote_elasticsearch',
            hosts,
          });
        }).toThrow();
      });
    });
  });
});
