/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';

import { modifyUrl } from '../modify_url';

describe('modifyUrl()', () => {
  it('throws an error with invalid input', () => {
    expect(() => modifyUrl(1, () => {})).to.throwError();
    expect(() => modifyUrl(undefined, () => {})).to.throwError();
    expect(() => modifyUrl('http://localhost')).to.throwError(); // no block
  });

  it('supports returning a new url spec', () => {
    expect(modifyUrl('http://localhost', () => ({}))).to.eql('');
  });

  it('supports modifying the passed object', () => {
    expect(modifyUrl('http://localhost', parsed => {
      parsed.port = 9999;
      parsed.auth = 'foo:bar';
    })).to.eql('http://foo:bar@localhost:9999/');
  });

  it('supports changing pathname', () => {
    expect(modifyUrl('http://localhost/some/path', parsed => {
      parsed.pathname += '/subpath';
    })).to.eql('http://localhost/some/path/subpath');
  });

  it('supports changing port', () => {
    expect(modifyUrl('http://localhost:5601', parsed => {
      parsed.port = (parsed.port * 1) + 1;
    })).to.eql('http://localhost:5602/');
  });

  it('supports changing protocol', () => {
    expect(modifyUrl('http://localhost', parsed => {
      parsed.protocol = 'mail';
      parsed.slashes = false;
      parsed.pathname = null;
    })).to.eql('mail:localhost');
  });
});
