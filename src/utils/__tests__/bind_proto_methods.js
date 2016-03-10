import expect from 'expect.js';

import { bindProtoMethods } from '../';

class SuperClass {
  inherited() {
    return this.prop;
  }

  echo(...args) {
    return args;
  }
}

class SubClass extends SuperClass {
  own() {
    return this.prop2;
  }
}

describe('bindProtoMethods', function () {
  it('only binds methods on own prototype', function () {
    const a = new SubClass();
    bindProtoMethods(a);

    expect(a.method).to.be(SubClass.prototype.method);
    expect(a.own).to.not.be(SubClass.prototype.own);
  });

  it('allows dereferencing the methods', function () {
    const a = new SubClass();
    bindProtoMethods(a);
    const fn = a.own;

    expect(fn()).to.be(undefined);
    a.prop2 = 'foo';
    expect(fn()).to.be('foo');
  });

  it('proxies the arguments', function () {
    const b = new SuperClass();
    bindProtoMethods(b);

    const fn = b.echo;
    expect(fn(1,2,3)).to.eql([1,2,3]);
  });
});
