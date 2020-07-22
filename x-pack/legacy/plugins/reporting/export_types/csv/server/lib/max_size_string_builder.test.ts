/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { MaxSizeStringBuilder } from './max_size_string_builder';

describe('MaxSizeStringBuilder', function () {
  describe('tryAppend', function () {
    it(`should return true if appended string is under maxSize`, function () {
      const builder = new MaxSizeStringBuilder(100);
      const result = builder.tryAppend('aa');
      expect(result).to.be(true);
    });

    it(`should return false if appended string is over the maxSize`, function () {
      const builder = new MaxSizeStringBuilder(1);
      const result = builder.tryAppend('aa');
      expect(result).to.be(false);
    });

    it(`should return true then false if second appended string puts total size over the maxSize`, function () {
      const builder = new MaxSizeStringBuilder(1);
      expect(builder.tryAppend('a')).to.be(true);
      expect(builder.tryAppend('a')).to.be(false);
    });
  });

  describe('getBuffer', function () {
    it(`should return an empty string when we don't call tryAppend`, function () {
      const builder = new MaxSizeStringBuilder(100);
      expect(builder.getString()).to.be('');
    });

    it('should return equivalent string if tryAppend called once and less than maxSize', function () {
      const str = 'foo';
      const builder = new MaxSizeStringBuilder(100);
      builder.tryAppend(str);
      expect(builder.getString()).to.be(str);
    });

    it('should return equivalent string if tryAppend called multiple times and total size less than maxSize', function () {
      const strs = ['foo', 'bar', 'baz'];
      const builder = new MaxSizeStringBuilder(100);
      strs.forEach((str) => builder.tryAppend(str));
      expect(builder.getString()).to.be(strs.join(''));
    });

    it('should return empty string if tryAppend called one time with size greater than maxSize', function () {
      const str = 'aa'; // each a is one byte
      const builder = new MaxSizeStringBuilder(1);
      builder.tryAppend(str);
      expect(builder.getString()).to.be('');
    });

    it('should return partial string if tryAppend called multiple times with total size greater than maxSize', function () {
      const str = 'a'; // each a is one byte
      const builder = new MaxSizeStringBuilder(1);
      builder.tryAppend(str);
      builder.tryAppend(str);
      expect(builder.getString()).to.be('a');
    });
  });

  describe('getSizeInBytes', function () {
    it(`should return 0 when no strings have been appended`, function () {
      const builder = new MaxSizeStringBuilder(100);
      expect(builder.getSizeInBytes()).to.be(0);
    });

    it(`should the size in bytes`, function () {
      const builder = new MaxSizeStringBuilder(100);
      const stringValue = 'foobar';
      builder.tryAppend(stringValue);
      expect(builder.getSizeInBytes()).to.be(stringValue.length);
    });
  });
});
