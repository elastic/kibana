/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

const XPACK_INFO_KEY = 'xpackMain.info';

describe('xpack_info service', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('updates the stored xpack info', () => {
    const updatedXPackInfo = {
      foo: {
        bar: 17,
      },
    };
    xpackInfo.setAll(updatedXPackInfo);
    expect(sessionStorage.getItem(XPACK_INFO_KEY)).to.be(JSON.stringify(updatedXPackInfo));
    expect(xpackInfo.get('foo.bar')).to.be(17);
  });

  it('clears the stored xpack info', () => {
    const updatedXPackInfo = {
      foo: {
        bar: 17,
      },
    };
    xpackInfo.setAll(updatedXPackInfo);
    expect(xpackInfo.get('foo.bar')).not.to.be(null);

    xpackInfo.clear();
    expect(sessionStorage.getItem(XPACK_INFO_KEY)).to.be(null);
    expect(xpackInfo.get('foo.bar')).to.be(undefined);
  });

  it('defaults to the provided default value if the requested path is not found', () => {
    xpackInfo.setAll({ foo: 'bar' });
    expect(xpackInfo.get('foo.baz', 17)).to.be(17);
  });
});
