/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isValidHttpUrl } from '../httpurl';

describe('httpurl.isValidHttpUrl', () => {
  it('matches HTTP URLs', () => {
    expect(isValidHttpUrl('http://server.com/veggie/hamburger.jpg')).to.be(true);
    expect(isValidHttpUrl('https://server.com:4443/veggie/hamburger.jpg')).to.be(true);
    expect(isValidHttpUrl('http://user:password@server.com:4443/veggie/hamburger.jpg')).to.be(true);
    expect(isValidHttpUrl('http://virtual-machine/veggiehamburger.jpg')).to.be(true);
    expect(isValidHttpUrl('https://virtual-machine:44330/veggie.jpg?hamburger')).to.be(true);
    expect(isValidHttpUrl('http://192.168.1.50/veggie/hamburger.jpg')).to.be(true);
    expect(isValidHttpUrl('https://2600::/veggie/hamburger.jpg')).to.be(true); // ipv6
    expect(isValidHttpUrl('http://2001:4860:4860::8844/veggie/hamburger.jpg')).to.be(true); // ipv6
  });
  it('rejects non-HTTP URLs', () => {
    expect(isValidHttpUrl('')).to.be(false);
    expect(isValidHttpUrl('http://server.com')).to.be(false);
    expect(isValidHttpUrl('file:///Users/programmer/Pictures/hamburger.jpeg')).to.be(false);
    expect(isValidHttpUrl('ftp://hostz.com:1111/path/to/image.png')).to.be(false);
    expect(isValidHttpUrl('ftp://user:password@host:1111/path/to/image.png')).to.be(false);
    expect(
      isValidHttpUrl('data:image/gif;base64,R0lGODlhPQBEAPeoAJosM//AwO/AwHVYZ/z595kzAP/s7P+...')
    ).to.be(false);
  });
});
