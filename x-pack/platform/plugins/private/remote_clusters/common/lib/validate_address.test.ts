/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isAddressValid, isPortValid, extractHostAndPort } from './validate_address';

describe('Validate address', () => {
  describe('isAddressValid', () => {
    describe('rejects invalid formats', () => {
      it('empty or undefined', () => {
        expect(isAddressValid('')).toBe(false);
        expect(isAddressValid(undefined)).toBe(false);
      });

      it('adjacent periods in hostname', () => {
        expect(isAddressValid('a..b')).toBe(false);
      });

      it('underscores in hostname', () => {
        expect(isAddressValid('host_name')).toBe(false);
      });

      it('special characters in hostname', () => {
        ['/', '\\', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '=', '+', '?'].forEach(
          (char) => {
            expect(isAddressValid(`host${char}name`)).toBe(false);
          }
        );
      });

      it('invalid IPv4 addresses', () => {
        expect(isAddressValid('256.1.1.1')).toBe(false);
        expect(isAddressValid('1.256.1.1')).toBe(false);
        expect(isAddressValid('1.1.256.1')).toBe(false);
        expect(isAddressValid('1.1.1.256')).toBe(false);
        expect(isAddressValid('1.1.1')).toBe(false);
        expect(isAddressValid('1.1.1.1.1')).toBe(false);
      });

      it('invalid IPv6 - double double colon', () => {
        expect(isAddressValid('[::1::2]')).toBe(false);
      });

      it('invalid IPv6 - missing closing bracket', () => {
        expect(isAddressValid('[2001:db8::1')).toBe(false);
      });

      it('invalid IPv6 - invalid hex characters', () => {
        expect(isAddressValid('[2001:db8::xyz]')).toBe(false);
        expect(isAddressValid('[gggg::]')).toBe(false);
      });

      it('invalid IPv6 - too many segments', () => {
        expect(isAddressValid('[1:2:3:4:5:6:7:8:9]')).toBe(false);
      });

      it('invalid IPv6 - segments too long', () => {
        expect(isAddressValid('[12345::]')).toBe(false);
        expect(isAddressValid('[::12345]')).toBe(false);
      });
    });

    describe('accepts valid formats', () => {
      describe('hostnames', () => {
        it('simple hostnames', () => {
          expect(isAddressValid('localhost')).toBe(true);
          expect(isAddressValid('server')).toBe(true);
          expect(isAddressValid('my-server')).toBe(true);
        });

        it('fully qualified domain names', () => {
          expect(isAddressValid('example.com')).toBe(true);
          expect(isAddressValid('sub.example.com')).toBe(true);
          expect(isAddressValid('a.b.c.d.e.f')).toBe(true);
        });

        it('hostnames with numbers', () => {
          expect(isAddressValid('server1')).toBe(true);
          expect(isAddressValid('123server')).toBe(true);
          expect(isAddressValid('server-123')).toBe(true);
        });

        it('hostnames with uppercase', () => {
          expect(isAddressValid('SERVER')).toBe(true);
          expect(isAddressValid('Server.Example.COM')).toBe(true);
        });
      });

      describe('IPv4 addresses', () => {
        it('valid IPv4 addresses', () => {
          expect(isAddressValid('192.168.1.1')).toBe(true);
          expect(isAddressValid('10.0.0.1')).toBe(true);
          expect(isAddressValid('255.255.255.255')).toBe(true);
          expect(isAddressValid('0.0.0.0')).toBe(true);
        });
      });

      describe('IPv6 addresses', () => {
        it('standard notation', () => {
          expect(isAddressValid('[2001:db8::1]')).toBe(true);
          expect(isAddressValid('[2001:db8:85a3::8a2e:370:7334]')).toBe(true);
        });

        it('compressed notation', () => {
          expect(isAddressValid('[::1]')).toBe(true);
          expect(isAddressValid('[::]')).toBe(true);
          expect(isAddressValid('[::ffff]')).toBe(true);
          expect(isAddressValid('[2001::]')).toBe(true);
          expect(isAddressValid('[::2001]')).toBe(true);
        });

        it('link-local with zone identifier', () => {
          expect(isAddressValid('[fe80::1%eth0]')).toBe(true);
          expect(isAddressValid('[fe80::1%1]')).toBe(true);
          expect(isAddressValid('[fe80::1%en0]')).toBe(true);
        });

        it('IPv4-mapped IPv6', () => {
          expect(isAddressValid('[::ffff:192.168.1.1]')).toBe(true);
          expect(isAddressValid('[::ffff:10.0.0.1]')).toBe(true);
          // ipaddr.js does not support this well-known format for now
          // in case we want to add support in the future
          // see https://datatracker.ietf.org/doc/html/rfc6052#section-2.1
          //
          // expect(isAddressValid('[64:ff9b::192.0.2.1]')).toBe(true);
        });

        it('full expanded form', () => {
          expect(isAddressValid('[2001:0db8:0000:0000:0000:0000:0000:0001]')).toBe(true);
          expect(isAddressValid('[2001:0db8:0000:0042:0000:8a2e:0370:7334]')).toBe(true);
        });

        it('IPv6 without brackets (not recommended but valid)', () => {
          expect(isAddressValid('2001:db8::1')).toBe(true);
          expect(isAddressValid('::1')).toBe(true);
          expect(isAddressValid('::')).toBe(true);
        });
      });
    });
  });

  describe('isPortValid', () => {
    describe('rejects invalid formats', () => {
      it('missing port', () => {
        expect(isPortValid('hostname')).toBe(false);
        expect(isPortValid('192.168.1.1')).toBe(false);
        expect(isPortValid('[2001:db8::1]')).toBe(false);
      });

      it('empty port', () => {
        expect(isPortValid('hostname:')).toBe(false);
        expect(isPortValid('[2001:db8::1]:')).toBe(false);
      });

      it('non-numeric port', () => {
        expect(isPortValid('hostname:abc')).toBe(false);
        expect(isPortValid('hostname:80a')).toBe(false);
        expect(isPortValid('hostname:8 0')).toBe(false);
        expect(isPortValid('[2001:db8::1]:abc')).toBe(false);
      });

      it('multiple ports', () => {
        expect(isPortValid('host:80:443')).toBe(false);
      });
    });

    describe('accepts valid formats', () => {
      describe('hostname/IPv4 with port', () => {
        it('hostname with port', () => {
          expect(isPortValid('localhost:9200')).toBe(true);
          expect(isPortValid('example.com:443')).toBe(true);
        });

        it('IPv4 with port', () => {
          expect(isPortValid('192.168.1.1:9300')).toBe(true);
          expect(isPortValid('10.0.0.1:80')).toBe(true);
        });

        it('various port numbers', () => {
          expect(isPortValid('host:1')).toBe(true);
          expect(isPortValid('host:80')).toBe(true);
          expect(isPortValid('host:443')).toBe(true);
          expect(isPortValid('host:9200')).toBe(true);
          expect(isPortValid('host:65535')).toBe(true);
          expect(isPortValid('host:100000000')).toBe(true); // Beyond standard range
        });
      });

      describe('IPv6 with port', () => {
        it('standard notation with port', () => {
          expect(isPortValid('[2001:db8::1]:9300')).toBe(true);
          expect(isPortValid('[2001:db8:85a3::8a2e:370:7334]:443')).toBe(true);
        });

        it('compressed notation with port', () => {
          expect(isPortValid('[::1]:9300')).toBe(true);
          expect(isPortValid('[::]:9300')).toBe(true);
        });

        it('link-local with zone and port', () => {
          expect(isPortValid('[fe80::1%eth0]:9300')).toBe(true);
          expect(isPortValid('[fe80::1%1]:80')).toBe(true);
        });

        it('IPv4-mapped with port', () => {
          expect(isPortValid('[::ffff:192.168.1.1]:9300')).toBe(true);
          expect(isPortValid('[64:ff9b::192.0.2.1]:443')).toBe(true);
        });

        it('full expanded form with port', () => {
          expect(isPortValid('[2001:0db8:0000:0000:0000:0000:0000:0001]:9300')).toBe(true);
        });
      });
    });
  });

  describe('extractHostAndPort', () => {
    describe('IPv4 and hostname parsing', () => {
      it('extracts hostname without port', () => {
        const result = extractHostAndPort('hostname');
        expect(result).toEqual({ host: 'hostname' });
      });

      it('extracts IPv4 without port', () => {
        const result = extractHostAndPort('1.1.1.1');
        expect(result).toEqual({ host: '1.1.1.1' });
      });

      it('extracts IPv4 with port', () => {
        const result = extractHostAndPort('2.2.2.2:9200');
        expect(result).toEqual({ host: '2.2.2.2', port: '9200' });
      });

      it('extracts hostname with port', () => {
        const result = extractHostAndPort('hostname:9200');
        expect(result).toEqual({ host: 'hostname', port: '9200' });
      });

      it('extracts domain with port', () => {
        const result = extractHostAndPort('example.com:443');
        expect(result).toEqual({ host: 'example.com', port: '443' });
      });
    });

    describe('IPv6 parsing', () => {
      it('extracts IPv6 host without port', () => {
        const result = extractHostAndPort('[2001:db8::1]');
        expect(result).toEqual({ host: '[2001:db8::1]' });
      });

      it('extracts naked IPv6 host without port', () => {
        const result = extractHostAndPort('2001:db8::1');
        expect(result).toEqual({ host: '2001:db8::1' });
      });

      it('extracts IPv6 host with port', () => {
        const result = extractHostAndPort('[2001:db8::1]:9300');
        expect(result).toEqual({ host: '[2001:db8::1]', port: '9300' });
      });

      it('extracts IPv6 loopback with port', () => {
        const result = extractHostAndPort('[::1]:9300');
        expect(result).toEqual({ host: '[::1]', port: '9300' });
      });

      it('extracts IPv6 wildcard with port', () => {
        const result = extractHostAndPort('[::]:9300');
        expect(result).toEqual({ host: '[::]', port: '9300' });
      });

      it('extracts IPv6 with zone identifier and port', () => {
        const result = extractHostAndPort('[fe80::1%eth0]:9300');
        expect(result).toEqual({ host: '[fe80::1%eth0]', port: '9300' });
      });

      it('extracts IPv4-mapped IPv6 host with port', () => {
        const result = extractHostAndPort('[::ffff:192.168.1.1]:9300');
        expect(result).toEqual({ host: '[::ffff:192.168.1.1]', port: '9300' });
      });
    });
  });
});
