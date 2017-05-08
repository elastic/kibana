import { unset } from '../unset';
import expect from 'expect.js';

describe('unset(obj, key)', function () {
  describe('invalid input', function () {
    it('should do nothing if not given an object', function () {
      const obj = 'hello';
      unset(obj, 'e');
      expect(obj).to.equal('hello');
    });

    it('should do nothing if not given a key', function () {
      const obj = { one: 1 };
      unset(obj);
      expect(obj).to.eql({ one: 1 });
    });

    it('should do nothing if given an empty string as a key', function () {
      const obj = { one: 1 };
      unset(obj, '');
      expect(obj).to.eql({ one: 1 });
    });
  });

  describe('shallow removal', function () {
    let obj;

    beforeEach(function () {
      obj = { one: 1, two: 2, deep: { three: 3, four: 4 } };
    });

    it('should remove the param using a string key', function () {
      unset(obj, 'two');
      expect(obj).to.eql({ one: 1, deep: { three: 3, four: 4 } });
    });

    it('should remove the param using an array key', function () {
      unset(obj, ['two']);
      expect(obj).to.eql({ one: 1, deep: { three: 3, four: 4 } });
    });
  });

  describe('deep removal', function () {
    let obj;

    beforeEach(function () {
      obj = { one: 1, two: 2, deep: { three: 3, four: 4 } };
    });

    it('should remove the param using a string key', function () {
      unset(obj, 'deep.three');
      expect(obj).to.eql({ one: 1, two: 2, deep: { four: 4 } });
    });

    it('should remove the param using an array key', function () {
      unset(obj, ['deep', 'three']);
      expect(obj).to.eql({ one: 1, two: 2, deep: { four: 4 } });
    });
  });

  describe('recursive removal', function () {
    it('should clear object if only value is removed', function () {
      const obj = { one: { two: { three: 3 } } };
      unset(obj, 'one.two.three');
      expect(obj).to.eql({});
    });

    it('should clear object if no props are left', function () {
      const obj = { one: { two: { three: 3 } } };
      unset(obj, 'one.two');
      expect(obj).to.eql({});
    });

    it('should remove deep property, then clear the object', function () {
      const obj = { one: { two: { three: 3, four: 4 } } };
      unset(obj, 'one.two.three');
      expect(obj).to.eql({ one: { two: { four: 4 } } });

      unset(obj, 'one.two.four');
      expect(obj).to.eql({});
    });
  });
});
